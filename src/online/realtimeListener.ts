import { supabase } from './supabaseClient';
import type { OnlineGameRecord, Room, RoomStatus } from '@/types';
import type { GameStatus, Side } from '@/types/game';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── DB row → typed model mappers ──────────────────────────────────────────────
// Supabase realtime sends snake_case column names; our types use camelCase.

function mapGameRecord(raw: Record<string, unknown>): OnlineGameRecord {
  return {
    id:            raw.id            as string,
    roomId:        raw.room_id       as string,
    boardState:    raw.board_state   as string,
    capturedTop:   raw.captured_top  as string,
    capturedBottom: raw.captured_bottom as string,
    currentTurn:   raw.current_turn  as Side,
    turnStartedAt: (raw.turn_started_at as string | null) ?? null,
    winner:        (raw.winner as Side | null) ?? null,
    gameStatus:    raw.game_status   as GameStatus,
    moveCount:     raw.move_count    as number,
    createdAt:     raw.created_at    as string,
    updatedAt:     raw.updated_at    as string,
  };
}

function mapRoom(raw: Record<string, unknown>): Room {
  return {
    id:                   raw.id       as string,
    status:               raw.status   as RoomStatus,
    hostId:               raw.host_id  as string,
    guestId:              (raw.guest_id as string | null) ?? null,
    currentTurnPlayerId:  (raw.current_turn_player_id as string | null) ?? null,
    winnerId:             (raw.winner_id as string | null) ?? null,
    createdAt:            raw.created_at as string,
    updatedAt:            raw.updated_at as string,
  };
}

// ── RealtimeListener ──────────────────────────────────────────────────────────

export class RealtimeListener {
  private readonly roomId: string;
  private readonly gameId: string;
  private channels: RealtimeChannel[] = [];
  private roomCallback: ((room: Room) => void) | null = null;
  private gameCallback: ((record: OnlineGameRecord) => void) | null = null;

  constructor(roomId: string, gameId: string) {
    this.roomId = roomId;
    this.gameId = gameId;
  }

  onRoomUpdate(callback: (room: Room) => void): void {
    this.roomCallback = callback;
  }

  onGameUpdate(callback: (record: OnlineGameRecord) => void): void {
    this.gameCallback = callback;
  }

  subscribe(): void {
    const roomChannel = supabase
      .channel(`room:${this.roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${this.roomId}` },
        (payload: { new?: unknown }) => {
          if (this.roomCallback && payload.new) {
            this.roomCallback(mapRoom(payload.new as Record<string, unknown>));
          }
        },
      )
      .subscribe();

    const gameChannel = supabase
      .channel(`game:${this.gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${this.gameId}` },
        (payload: { new?: unknown }) => {
          if (this.gameCallback && payload.new) {
            this.gameCallback(mapGameRecord(payload.new as Record<string, unknown>));
          }
        },
      )
      .subscribe();

    this.channels.push(roomChannel, gameChannel);
  }

  unsubscribe(): void {
    for (const channel of this.channels) {
      void supabase.removeChannel(channel);
    }
    this.channels = [];
  }
}
