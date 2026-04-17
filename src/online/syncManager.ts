import type {
  Action, Coord, DropAction, GameState, OnlineGameRecord, PieceType, Side,
} from '@/types';
import type { PlayerProfile } from '@/types/player';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createInitialGameState } from '@/engine/gameState';
import { applyAction, getLegalMoves } from '@/engine/rules';
import { cloneGameState } from '@/engine/gameState';
import { isTimerExpired } from '@/engine/timer';
import { submitMove } from './actionSubmitter';
import { RealtimeListener } from './realtimeListener';
import { enterMatchmakingQueue, cancelMatchmaking } from './matchmaker';
import { supabase } from './supabaseClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<PlayerProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, rating, country_code')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id:          data.id          as string,
    nickname:    data.nickname    as string,
    rating:      data.rating      as number,
    countryCode: (data.country_code as string) ?? '',
  };
}

// ── Deserializer ──────────────────────────────────────────────────────────────

export function deserializeGameRecord(
  record: OnlineGameRecord,
  mode: GameState['mode'],
  online: GameState['online'],
): GameState {
  const board          = JSON.parse(record.boardState) as GameState['board'];
  const capturedTop    = JSON.parse(record.capturedTop) as PieceType[];
  const capturedBottom = JSON.parse(record.capturedBottom) as PieceType[];

  return {
    board,
    currentTurn:   record.currentTurn as Side,
    reserves:      { top: capturedTop, bottom: capturedBottom },
    status:        record.gameStatus as GameState['status'],
    winner:        record.winner as Side | null,
    winReason:     null,
    moveHistory:   [],
    mode,
    turnStartedAt: record.turnStartedAt ? new Date(record.turnStartedAt).getTime() : Date.now(),
    timerDuration: 30,
    entryState:    null,
    online,
  };
}

// ── OnlineGameController ──────────────────────────────────────────────────────

export class OnlineGameController {
  private _state: GameState;
  private _roomId: string | null = null;
  private _gameId: string | null = null;
  private _playerId: string;
  private _playerSide: Side | null = null;
  private _listener: RealtimeListener | null = null;
  private _queueChannel: RealtimeChannel | null = null;
  private _selectedCoord: Coord | null = null;

  private _myProfile: PlayerProfile | null = null;
  private _opponentProfile: PlayerProfile | null = null;
  private _ratingsUpdated = false;

  onStateChange: ((state: GameState) => void) | null = null;

  constructor(playerId: string) {
    this._playerId = playerId;
    this._state = createInitialGameState('online');
  }

  get state(): GameState { return this._state; }

  // ── Matchmaking ──────────────────────────────────────────────

  /**
   * 레이팅 기반 랜덤 매칭 진입.
   * - 'matched' : 즉시 매칭 성공 → GameScene 전환 가능
   * - 'searching': 큐 대기 중 → onStateChange(status='playing') 신호 대기
   */
  async findMatch(): Promise<'matched' | 'searching'> {
    this._myProfile = await fetchProfile(this._playerId);
    const rating = this._myProfile?.rating ?? 1200;

    const initialState = createInitialGameState('online');
    const result = await enterMatchmakingQueue(
      this._playerId,
      rating,
      JSON.stringify(initialState.board),
    );

    if (result.matched && result.roomId && result.gameId && result.playerSide) {
      await this._onMatchFound(result.roomId, result.gameId, result.playerSide);
      return 'matched';
    }

    // 큐 대기 — realtime으로 매칭 알림 수신
    this._subscribeToQueue();
    return 'searching';
  }

  /** 대기 취소. */
  async cancelSearch(): Promise<void> {
    this._unsubscribeQueue();
    await cancelMatchmaking(this._playerId);
  }

  // ── Game actions ────────────────────────────────────────────

  async submitAction(action: Action): Promise<boolean> {
    if (this._gameId === null || this._playerSide === null) return false;
    if (this._state.currentTurn !== this._playerSide || this._state.status !== 'playing') return false;

    try {
      const nextState = await submitMove({
        gameId:   this._gameId,
        playerId: this._playerId,
        state:    this._state,
        action,
      });
      this._state = this._withProfiles(nextState);
      this._selectedCoord = null;
      this.onStateChange?.(this._state);
      return true;
    } catch {
      return false;
    }
  }

  tick(): void {
    if (this._state.status !== 'playing') return;
    if (isTimerExpired(this._state) && this._state.currentTurn === this._playerSide) {
      void this._handleTimeout();
    }
  }

  startGame(): void {
    // No-op: game starts via matchmaking result.
  }

  destroy(): void {
    this._listener?.unsubscribe();
    this._unsubscribeQueue();
  }

  // ── Coord helpers ────────────────────────────────────────────

  getSelectedCoord(): Coord | null { return this._selectedCoord; }
  selectCoord(coord: Coord | null): void { this._selectedCoord = coord; }

  getLegalDropTargets(piece: PieceType): Coord[] {
    if (this._state.status !== 'playing') return [];
    if (this._state.currentTurn !== this._playerSide) return [];
    return getLegalMoves(this._state)
      .filter((a): a is DropAction => a.kind === 'drop' && a.piece === piece)
      .map(a => a.to);
  }

  getLegalMovesForSelected(): Action[] {
    if (this._selectedCoord === null || this._state.status !== 'playing') return [];
    if (this._state.currentTurn !== this._playerSide) return [];
    const { row, col } = this._selectedCoord;
    return getLegalMoves(this._state).filter(
      a => a.kind !== 'drop' && a.from.row === row && a.from.col === col,
    );
  }

  // ── Private helpers ──────────────────────────────────────────

  private async _onMatchFound(roomId: string, gameId: string, side: Side): Promise<void> {
    this._roomId     = roomId;
    this._gameId     = gameId;
    this._playerSide = side;

    // 상대 프로필 조회
    const { data: room } = await supabase
      .from('rooms')
      .select('host_id, guest_id')
      .eq('id', roomId)
      .single();

    const opponentId = side === 'bottom'
      ? (room as Record<string, string> | null)?.host_id
      : (room as Record<string, string> | null)?.guest_id;

    if (opponentId) {
      this._opponentProfile = await fetchProfile(opponentId);
    }

    // 현재 게임 상태를 DB에서 가져와 로컬 state 동기화
    const { data: gameRow } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameRow) {
      const raw = gameRow as Record<string, unknown>;
      const online: GameState['online'] = {
        roomId,
        playerSide:      side,
        opponentId:      opponentId ?? null,
        syncVersion:     raw.move_count as number,
        myProfile:       this._myProfile,
        opponentProfile: this._opponentProfile,
      };
      this._state = deserializeGameRecord({
        id:             raw.id             as string,
        roomId:         raw.room_id        as string,
        boardState:     raw.board_state    as string,
        capturedTop:    raw.captured_top   as string,
        capturedBottom: raw.captured_bottom as string,
        currentTurn:    raw.current_turn   as Side,
        turnStartedAt:  (raw.turn_started_at as string | null) ?? null,
        winner:         (raw.winner        as Side | null) ?? null,
        gameStatus:     raw.game_status    as GameState['status'],
        moveCount:      raw.move_count     as number,
        createdAt:      raw.created_at     as string,
        updatedAt:      raw.updated_at     as string,
      }, 'online', online);
    }

    this._setupRealtime();
  }

  private _subscribeToQueue(): void {
    this._queueChannel = supabase
      .channel(`queue:${this._playerId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'matchmaking_queue',
          filter: `player_id=eq.${this._playerId}`,
        },
        async (payload: { new?: unknown }) => {
          const row = payload.new as Record<string, unknown>;
          if (
            row?.status   === 'matched' &&
            row.room_id   !== null &&
            row.game_id   !== null
          ) {
            this._unsubscribeQueue();
            await this._onMatchFound(
              row.room_id as string,
              row.game_id as string,
              'top',  // 대기 중이던 플레이어는 항상 top
            );
            this.onStateChange?.(this._state);
          }
        },
      )
      .subscribe();
  }

  private _unsubscribeQueue(): void {
    if (this._queueChannel) {
      void supabase.removeChannel(this._queueChannel);
      this._queueChannel = null;
    }
  }

  private _withProfiles(state: GameState): GameState {
    if (!state.online) return state;
    return {
      ...state,
      online: {
        ...state.online,
        myProfile:       this._myProfile,
        opponentProfile: this._opponentProfile,
      },
    };
  }

  private async _handleTimeout(): Promise<void> {
    if (!this._gameId || this._state.status !== 'playing') return;
    const winner: Side = this._playerSide === 'top' ? 'bottom' : 'top';
    await supabase.from('games').update({
      game_status: 'finished',
      winner,
    }).eq('id', this._gameId);
  }

  private async _applyEloRatings(): Promise<void> {
    if (!this._gameId || this._ratingsUpdated) return;
    this._ratingsUpdated = true;
    try {
      const { error } = await supabase.rpc('update_elo_ratings', {
        p_game_id: this._gameId,
      });
      if (error) console.error('ELO update failed:', error.message);
    } catch (err) {
      console.error('ELO update error:', err);
    }
  }

  private _setupRealtime(): void {
    if (this._roomId === null || this._gameId === null) return;

    this._listener = new RealtimeListener(this._roomId, this._gameId);

    this._listener.onGameUpdate(record => {
      if (this._playerSide === null) return;

      const online: GameState['online'] = {
        roomId:          this._roomId!,
        playerSide:      this._playerSide,
        opponentId:      null,
        syncVersion:     record.moveCount,
        myProfile:       this._myProfile,
        opponentProfile: this._opponentProfile,
      };

      this._state = deserializeGameRecord(record, 'online', online);
      this.onStateChange?.(this._state);

      if (record.gameStatus === 'finished') {
        void this._applyEloRatings();
      }
    });

    this._listener.subscribe();
  }
}
