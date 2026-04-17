import { supabase } from './supabaseClient';
import type { Side } from '@/types';

export interface MatchResult {
  matched: boolean;
  roomId: string | null;
  gameId: string | null;
  playerSide: Side | null;
}

/** 매칭 큐에 진입. 상대가 있으면 즉시 matched=true, 없으면 false(대기 중). */
export async function enterMatchmakingQueue(
  playerId: string,
  rating: number,
  boardStateJson: string,
): Promise<MatchResult> {
  const { data, error } = await supabase.rpc('find_or_create_match', {
    p_player_id:   playerId,
    p_rating:      rating,
    p_board_state: JSON.parse(boardStateJson) as object,
  });

  if (error) {
    console.error('[Matchmaker] RPC error:', error);
    throw new Error(`Matchmaking failed: ${error.message}`);
  }
  console.log('[Matchmaker] RPC result:', data);

  type RpcRow = {
    matched: boolean;
    out_room_id: string | null;
    out_game_id: string | null;
    player_side: string | null;
  };
  const row = (data as RpcRow[])?.[0];
  if (!row) throw new Error('No result from matchmaking RPC');

  return {
    matched:    row.matched,
    roomId:     row.out_room_id,
    gameId:     row.out_game_id,
    playerSide: row.player_side as Side | null,
  };
}

/** 대기 중인 큐 항목을 취소 상태로 변경. */
export async function cancelMatchmaking(playerId: string): Promise<void> {
  await supabase
    .from('matchmaking_queue')
    .update({ status: 'cancelled' })
    .eq('player_id', playerId)
    .eq('status', 'waiting');
}
