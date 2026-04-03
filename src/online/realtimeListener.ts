import { supabase } from './supabaseClient';
import type { OnlineGameRecord, Room } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
        payload => {
          if (this.roomCallback !== null && payload.new) {
            this.roomCallback(payload.new as Room);
          }
        },
      )
      .subscribe();

    const gameChannel = supabase
      .channel(`game:${this.gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${this.gameId}` },
        payload => {
          if (this.gameCallback !== null && payload.new) {
            this.gameCallback(payload.new as OnlineGameRecord);
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
