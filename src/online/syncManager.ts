import type { Action, Board, GameState, OnlineGameRecord, PieceType, Side } from '@/types';
import { createInitialGameState } from '@/engine/gameState';
import { checkWinAfterAction } from '@/engine/winCondition';
import { applyAction } from '@/engine/rules';
import { cloneGameState } from '@/engine/gameState';
import { submitMove } from './actionSubmitter';
import { RealtimeListener } from './realtimeListener';
import { createInitialGame, createRoom, joinRoom } from './roomManager';

/**
 * Deserializes a server OnlineGameRecord into a local GameState.
 * Server state is always authoritative.
 */
export function deserializeGameRecord(
  record: OnlineGameRecord,
  mode: GameState['mode'],
  online: GameState['online'],
): GameState {
  const board = JSON.parse(record.boardState) as Board;
  const capturedTop = JSON.parse(record.capturedTop) as PieceType[];
  const capturedBottom = JSON.parse(record.capturedBottom) as PieceType[];

  return {
    board,
    currentTurn: record.currentTurn as Side,
    reserves: { top: capturedTop, bottom: capturedBottom },
    status: record.gameStatus as GameState['status'],
    winner: record.winner as Side | null,
    moveHistory: [],
    mode,
    turnStartedAt: record.turnStartedAt ? new Date(record.turnStartedAt).getTime() : 0,
    timerDuration: 30,
    entryState: null,
    online,
  };
}

/**
 * OnlineGameController manages the full lifecycle of an online match:
 * room creation/joining, game state sync, and move submission.
 */
export class OnlineGameController {
  private _state: GameState;
  private _roomId: string | null = null;
  private _gameId: string | null = null;
  private _playerId: string;
  private _playerSide: Side | null = null;
  private _listener: RealtimeListener | null = null;

  onStateChange: ((state: GameState) => void) | null = null;

  constructor(playerId: string) {
    this._playerId = playerId;
    this._state = createInitialGameState('online');
  }

  get state(): GameState {
    return this._state;
  }

  /** Host creates a new room and initializes the game. */
  async hostGame(): Promise<string> {
    const room = await createRoom(this._playerId);
    this._roomId = room.id;
    this._playerSide = 'top';

    const initialState = createInitialGameState('online', {
      roomId: room.id,
      playerSide: 'top',
      opponentId: null,
      syncVersion: 0,
    });

    const gameRecord = await createInitialGame(room.id, initialState);
    this._gameId = gameRecord.id;
    this._state = initialState;

    this._setupRealtime();
    return room.id;
  }

  /** Guest joins an existing room. */
  async joinGame(roomId: string): Promise<void> {
    const room = await joinRoom(roomId, this._playerId);
    this._roomId = room.id;
    this._playerSide = 'bottom';
    this._setupRealtime();
  }

  /** Submit a move on behalf of this player. */
  async submitAction(action: Action): Promise<boolean> {
    if (this._gameId === null) return false;
    if (this._playerSide === null) return false;
    if (this._state.currentTurn !== this._playerSide) return false;

    try {
      const nextState = await submitMove({
        gameId: this._gameId,
        playerId: this._playerId,
        state: this._state,
        action,
      });
      this._state = nextState;
      this.onStateChange?.(this._state);
      return true;
    } catch {
      return false;
    }
  }

  destroy(): void {
    this._listener?.unsubscribe();
  }

  private _setupRealtime(): void {
    if (this._roomId === null || this._gameId === null) return;

    this._listener = new RealtimeListener(this._roomId, this._gameId);

    this._listener.onGameUpdate(record => {
      if (this._playerSide === null) return;

      const online: GameState['online'] = {
        roomId: this._roomId!,
        playerSide: this._playerSide,
        opponentId: null,
        syncVersion: record.moveCount,
      };

      // Server state is authoritative — replace local state
      this._state = deserializeGameRecord(record, 'online', online);
      this.onStateChange?.(this._state);
    });

    this._listener.subscribe();
  }
}
