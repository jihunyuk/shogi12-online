import type { Action, AiDifficulty, GameState, Side } from '@/types';
import { getOpponent } from '@/engine/gameState';
import { getLegalMoves, applyAction } from '@/engine/rules';
import { checkWinAfterAction } from '@/engine/winCondition';
import { evaluateBoard } from './evaluator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Returns any move that immediately captures the opponent's 王. */
function findKingCapture(state: GameState, moves: Action[]): Action | null {
  const opponent = getOpponent(state.currentTurn);
  const { board } = state;
  const hits = moves.filter(a => {
    if (a.kind === 'drop') return false;
    const t = board[a.to.row][a.to.col];
    return t !== null && t.side === opponent && t.type === '王';
  });
  return hits.length > 0 ? pickRandom(hits) : null;
}

/** Returns moves that capture any opponent piece (excluding king-only check). */
function findCaptures(state: GameState, moves: Action[]): Action[] {
  const opponent = getOpponent(state.currentTurn);
  const { board } = state;
  return moves.filter(a => {
    if (a.kind === 'drop') return false;
    const t = board[a.to.row][a.to.col];
    return t !== null && t.side === opponent;
  });
}

// ── Minimax with alpha-beta pruning ──────────────────────────────────────────

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  aiSide: Side,
): number {
  if (state.status === 'finished' || depth === 0) {
    return evaluateBoard(state, aiSide);
  }

  const moves = getLegalMoves(state);
  if (moves.length === 0) return evaluateBoard(state, aiSide);

  if (state.currentTurn === aiSide) {
    // Maximising
    let best = -Infinity;
    for (const move of moves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const score = minimax(next, depth - 1, alpha, beta, aiSide);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    // Minimising
    let best = Infinity;
    for (const move of moves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const score = minimax(next, depth - 1, alpha, beta, aiSide);
      if (score < best) best = score;
      if (score < beta) beta = score;
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Runs minimax from the root and returns the best action found.
 * Shared by all difficulties — only the search depth differs.
 */
function bestActionByMinimax(state: GameState, side: Side, depth: number): Action {
  const moves = getLegalMoves(state);
  let bestScore = -Infinity;
  let bestMove  = moves[0];

  for (const move of moves) {
    const next  = checkWinAfterAction(state, applyAction(state, move), move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, side);
    if (score > bestScore) { bestScore = score; bestMove = move; }
  }

  return bestMove;
}

/**
 * Chooses an action for `side` based on the requested difficulty level.
 *
 * 하 (easy)   — minimax depth-3: makes sensible moves but plans only 3 plies ahead
 * 중 (medium) — minimax depth-4: moderate lookahead, noticeably stronger than easy
 * 상 (hard)   — minimax depth-5: full search with alpha-beta pruning
 *
 * All levels immediately take a winning king-capture when available.
 */
export function chooseAction(
  state: GameState,
  side: Side,
  difficulty: AiDifficulty = 'medium',
): Action | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  // Every difficulty instantly takes the winning move.
  const kingCapture = findKingCapture(state, moves);
  if (kingCapture) return kingCapture;

  const depthMap: Record<AiDifficulty, number> = {
    easy:   3,
    medium: 4,
    hard:   5,
  };

  return bestActionByMinimax(state, side, depthMap[difficulty]);
}
