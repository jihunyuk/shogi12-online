import { supabase } from './supabaseClient';
import { isLegalAction, applyAction } from '@/engine/rules';
import { cloneGameState } from '@/engine/gameState';
import { checkWinAfterAction } from '@/engine/winCondition';
import type { Action, GameState } from '@/types';

export async function submitMove(params: {
  gameId: string;
  playerId: string;
  state: GameState;
  action: Action;
}): Promise<GameState> {
  const { gameId, playerId, state, action } = params;

  if (!isLegalAction(state, action)) {
    throw new Error('Illegal action — client-side validation failed');
  }

  const prevState = state;
  let nextState = applyAction(cloneGameState(prevState), action);
  nextState = checkWinAfterAction(prevState, nextState, action);

  const now = new Date().toISOString();
  const moveNumber = prevState.moveHistory.length + 1;

  // Upsert authoritative game state
  const { error: gameError } = await supabase
    .from('games')
    .update({
      board_state: JSON.stringify(nextState.board),
      captured_top: JSON.stringify(nextState.reserves.top),
      captured_bottom: JSON.stringify(nextState.reserves.bottom),
      current_turn: nextState.currentTurn,
      turn_started_at: now,
      winner: nextState.winner ?? null,
      game_status: nextState.status,
      move_count: moveNumber,
      updated_at: now,
    })
    .eq('id', gameId);

  if (gameError) throw new Error(`submitMove game update failed: ${gameError.message}`);

  // Insert move log
  const { error: moveError } = await supabase.from('moves').insert({
    game_id: gameId,
    player_id: playerId,
    move_number: moveNumber,
    move_type: action.kind,
    from_row: action.kind === 'move' ? action.from.row : null,
    from_col: action.kind === 'move' ? action.from.col : null,
    to_row: action.to.row,
    to_col: action.to.col,
    piece_type: action.kind === 'move'
      ? (prevState.board[action.from.row][action.from.col]?.type ?? '')
      : action.piece,
    promoted: action.kind === 'move' ? (action.promotion ?? false) : false,
    captured_piece: nextState.moveHistory[nextState.moveHistory.length - 1]?.capturedPiece ?? null,
    created_at: now,
  });

  if (moveError) throw new Error(`submitMove move insert failed: ${moveError.message}`);

  return nextState;
}
