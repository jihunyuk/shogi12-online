import type { Action, GameState, Side } from '@/types';
import { getOpponent } from '@/engine/gameState';
import { generateAllMoves } from './moveGenerator';

/**
 * Configuration for future minimax / alpha-beta upgrade.
 * depth and randomize are unused in the current implementation but
 * accepted so call-sites are forward-compatible.
 */
export interface AIConfig {
  depth: number;
  randomize: boolean;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Chooses an action for `side` given the current game state.
 *
 * Strategy (v1 — simple but correct):
 *   1. Generate all legal moves for the current turn.
 *   2. If none, return null.
 *   3. Prefer any move that captures the opponent's 王; pick one randomly.
 *   4. Otherwise pick a uniformly random legal move.
 */
export function chooseAction(
  state: GameState,
  side: Side,
  _config: AIConfig = { depth: 1, randomize: true },
): Action | null {
  const moves = generateAllMoves(state);
  if (moves.length === 0) return null;

  const opponentSide = getOpponent(side);
  const { board } = state;

  const kingCaptures = moves.filter(action => {
    if (action.kind === 'drop') return false;
    const target = board[action.to.row][action.to.col];
    return target !== null && target.side === opponentSide && target.type === '王';
  });

  if (kingCaptures.length > 0) return pickRandom(kingCaptures);
  return pickRandom(moves);
}
