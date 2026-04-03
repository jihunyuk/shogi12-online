import type { GameState, Side } from '@/types';

/**
 * Evaluates the board from the perspective of `side`.
 *
 * PLACEHOLDER — intentionally minimal for the initial implementation.
 * Future versions should replace the `return 0` branch with material counts,
 * positional bonuses, and mobility scores to support minimax/alpha-beta search.
 *
 * @returns +10000 if `side` has won, -10000 if the opponent has won, 0 otherwise.
 */
export function evaluateBoard(state: GameState, side: Side): number {
  const { winner } = state;

  if (winner === side) return 10000;
  if (winner !== null) return -10000;

  // TODO: replace with material + positional heuristics for minimax scoring
  return 0;
}
