import type { Action, GameState } from '@/types';
import { getLegalMoves, getMoveCandidates } from '@/engine/rules';

export { getLegalMoves, getMoveCandidates };

/** Returns all legal moves for the current turn's side. */
export function generateAllMoves(state: GameState): Action[] {
  return getLegalMoves(state);
}

/**
 * Returns only move actions that capture an opponent's piece.
 * Drop actions are excluded (drops cannot land on occupied squares).
 */
export function generateCaptureMoves(state: GameState): Action[] {
  const { board, currentTurn } = state;

  return getLegalMoves(state).filter(action => {
    if (action.kind === 'drop') return false;
    const target = board[action.to.row][action.to.col];
    return target !== null && target.side !== currentTurn;
  });
}
