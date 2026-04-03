import { supabase } from './supabaseClient';
import type { GameState, OnlineGameRecord, Room } from '@/types';

function serializeRoom(data: Record<string, unknown>): Room {
  return {
    id: data.id as string,
    status: data.status as Room['status'],
    hostId: data.host_id as string,
    guestId: (data.guest_id as string | null) ?? null,
    currentTurnPlayerId: (data.current_turn_player_id as string | null) ?? null,
    winnerId: (data.winner_id as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function createRoom(hostId: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ host_id: hostId, status: 'waiting' })
    .select()
    .single();

  if (error) throw new Error(`createRoom failed: ${error.message}`);
  return serializeRoom(data as Record<string, unknown>);
}

export async function joinRoom(roomId: string, guestId: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update({ guest_id: guestId, status: 'playing' })
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw new Error(`joinRoom failed: ${error.message}`);
  return serializeRoom(data as Record<string, unknown>);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw new Error(`getRoomById failed: ${error.message}`);
  if (data === null) return null;
  return serializeRoom(data as Record<string, unknown>);
}

export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  const room = await getRoomById(roomId);
  if (room === null) return;

  if (room.hostId === playerId) {
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', roomId);
    if (error) throw new Error(`leaveRoom (host) failed: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('rooms')
      .update({ guest_id: null, status: 'waiting' })
      .eq('id', roomId);
    if (error) throw new Error(`leaveRoom (guest) failed: ${error.message}`);
  }
}

export async function createInitialGame(
  roomId: string,
  initialState: GameState,
): Promise<OnlineGameRecord> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      room_id: roomId,
      board_state: JSON.stringify(initialState.board),
      captured_top: JSON.stringify(initialState.reserves.top),
      captured_bottom: JSON.stringify(initialState.reserves.bottom),
      current_turn: initialState.currentTurn,
      turn_started_at: null,
      winner: null,
      game_status: 'waiting',
      move_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`createInitialGame failed: ${error.message}`);
  return data as OnlineGameRecord;
}
