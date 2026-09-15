import type { Action, AiDifficulty, Coord, GameState, PieceType, Side } from '@/types';
import { getOpponent } from '@/engine/gameState';
import { getLegalMoves, applyAction } from '@/engine/rules';
import { checkWinAfterAction } from '@/engine/winCondition';
import { computeZobristHash } from '@/engine/zobrist';
import { globalTT, TTFlag } from './graph/transpositionTable';
import { evaluateGraph } from './graph/graphEvaluator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Immediate king capture finder */
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

/** Immediate winning entry move finder */
function findEntryWinningMove(state: GameState, moves: Action[]): Action | null {
  const { currentTurn, board } = state;
  const entryRow = currentTurn === 'top' ? 3 : 0;

  for (const move of moves) {
    if (move.kind === 'move') {
      const piece = board[move.from.row][move.from.col];
      if (piece?.type === '王' && move.to.row === entryRow) {
        // Test if this move leads to an entry win that opponent cannot capture
        const next = checkWinAfterAction(state, applyAction(state, move), move);
        const oppMoves = getLegalMoves(next);
        const oppCanCapture = oppMoves.some(om => {
          if (om.kind === 'drop') return false;
          return om.to.row === move.to.row && om.to.col === move.to.col;
        });
        if (!oppCanCapture) {
          return move;
        }
      }
    }
  }
  return null;
}

const PIECE_VALUES_ORDER: Record<PieceType, number> = {
  '王': 10000,
  '將': 500,
  '後': 400,
  '相': 350,
  '子': 100,
};

/**
 * Move ordering function using Graph Edge Prioritization:
 * 1. Transposition table PV / best move
 * 2. Captures sorted by MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
 * 3. Pawn promotions
 * 4. Quiet drops / moves
 */
function orderMoves(
  state: GameState,
  moves: Action[],
  ttBestMove: Action | null,
): Action[] {
  const opponent = getOpponent(state.currentTurn);
  const { board } = state;

  return moves.slice().sort((a, b) => {
    // 1. TT Best move first
    if (ttBestMove) {
      const aIsTT = isSameAction(a, ttBestMove);
      const bIsTT = isSameAction(b, ttBestMove);
      if (aIsTT && !bIsTT) return -1;
      if (!aIsTT && bIsTT) return 1;
    }

    // 2. MVV-LVA score
    const scoreA = getActionPriority(a, board, opponent);
    const scoreB = getActionPriority(b, board, opponent);
    return scoreB - scoreA;
  });
}

function getActionPriority(action: Action, board: GameState['board'], opponent: Side): number {
  if (action.kind === 'drop') return 10;

  const target = board[action.to.row][action.to.col];
  const moving = board[action.from.row][action.from.col];
  let priority = 0;

  if (target !== null && target.side === opponent) {
    const victimVal = PIECE_VALUES_ORDER[target.type] || 0;
    const attackerVal = moving ? PIECE_VALUES_ORDER[moving.type] || 0 : 0;
    priority += 1000 + victimVal * 10 - attackerVal;
  }

  if (action.promotion) {
    priority += 300;
  }

  return priority;
}

function isSameAction(a: Action, b: Action): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'move' && b.kind === 'move') {
    return (
      a.from.row === b.from.row &&
      a.from.col === b.from.col &&
      a.to.row === b.to.row &&
      a.to.col === b.to.col &&
      (a.promotion ?? false) === (b.promotion ?? false)
    );
  }
  if (a.kind === 'drop' && b.kind === 'drop') {
    return (
      a.piece === b.piece &&
      a.to.row === b.to.row &&
      a.to.col === b.to.col
    );
  }
  return false;
}

// ── Quiescence Search ─────────────────────────────────────────────────────────

/**
 * Searches capture exchanges until a quiet position is reached,
 * eliminating the Horizon Effect.
 */
function quiescence(
  state: GameState,
  alpha: number,
  beta: number,
  aiSide: Side,
  maxQDepth = 3,
): number {
  if (state.status === 'finished') {
    return evaluateGraph(state, aiSide);
  }

  const standPat = evaluateGraph(state, aiSide);
  if (maxQDepth <= 0) return standPat;

  if (state.currentTurn === aiSide) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    // Only search captures
    const captureMoves = getLegalMoves(state).filter(a => {
      if (a.kind === 'drop') return false;
      const t = state.board[a.to.row][a.to.col];
      return t !== null && t.side !== aiSide;
    });

    for (const move of captureMoves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const score = quiescence(next, alpha, beta, aiSide, maxQDepth - 1);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;

    const captureMoves = getLegalMoves(state).filter(a => {
      if (a.kind === 'drop') return false;
      const t = state.board[a.to.row][a.to.col];
      return t !== null && t.side === aiSide;
    });

    for (const move of captureMoves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const score = quiescence(next, alpha, beta, aiSide, maxQDepth - 1);
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

// ── Graph Alpha-Beta with Transposition Table ────────────────────────────────

function graphMinimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  aiSide: Side,
  pathHashes: Set<bigint>,
  useQuiescence: boolean,
): number {
  // Game over check
  if (state.status === 'finished') {
    return evaluateGraph(state, aiSide);
  }

  const hash = computeZobristHash(state);

  // Graph Cycle / Sennichite (천일수) detection along current search branch
  if (pathHashes.has(hash)) {
    return 0; // Draw score
  }

  // Probe Transposition Table
  const ttProbe = globalTT.probe(hash, depth, alpha, beta);
  if (ttProbe.cutoff && ttProbe.score !== undefined) {
    return ttProbe.score;
  }

  // Leaf node
  if (depth <= 0) {
    return useQuiescence
      ? quiescence(state, alpha, beta, aiSide)
      : evaluateGraph(state, aiSide);
  }

  const rawMoves = getLegalMoves(state);
  if (rawMoves.length === 0) {
    return evaluateGraph(state, aiSide);
  }

  // Order moves with TT best move prioritized
  const moves = orderMoves(state, rawMoves, ttProbe.bestMove ?? null);

  pathHashes.add(hash);

  let bestMove: Action | null = null;
  const origAlpha = alpha;

  if (state.currentTurn === aiSide) {
    // Maximising
    let maxEval = -Infinity;
    for (const move of moves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const evalScore = graphMinimax(next, depth - 1, alpha, beta, aiSide, pathHashes, useQuiescence);

      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMove = move;
      }
      if (evalScore > alpha) alpha = evalScore;
      if (beta <= alpha) break; // Beta cutoff
    }

    pathHashes.delete(hash);

    // Save into Transposition Table
    let flag = TTFlag.EXACT;
    if (maxEval <= origAlpha) flag = TTFlag.UPPERBOUND;
    else if (maxEval >= beta) flag = TTFlag.LOWERBOUND;

    globalTT.store(hash, depth, maxEval, flag, bestMove);
    return maxEval;
  } else {
    // Minimising
    let minEval = Infinity;
    for (const move of moves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const evalScore = graphMinimax(next, depth - 1, alpha, beta, aiSide, pathHashes, useQuiescence);

      if (evalScore < minEval) {
        minEval = evalScore;
        bestMove = move;
      }
      if (evalScore < beta) beta = evalScore;
      if (beta <= alpha) break; // Alpha cutoff
    }

    pathHashes.delete(hash);

    let flag = TTFlag.EXACT;
    if (minEval <= origAlpha) flag = TTFlag.UPPERBOUND;
    else if (minEval >= beta) flag = TTFlag.LOWERBOUND;

    globalTT.store(hash, depth, minEval, flag, bestMove);
    return minEval;
  }
}

// ── Public Search API ─────────────────────────────────────────────────────────

/**
 * Runs iterative deepening graph search from the root.
 */
function searchBestAction(
  state: GameState,
  side: Side,
  targetDepth: number,
  useQuiescence: boolean,
): Action {
  const rawMoves = getLegalMoves(state);
  if (rawMoves.length === 1) return rawMoves[0];

  globalTT.incrementAge();

  let bestOverallMove: Action = rawMoves[0];
  const pathHashes = new Set<bigint>();

  // Iterative Deepening from depth 1 to targetDepth
  for (let d = 1; d <= targetDepth; d++) {
    const rootHash = computeZobristHash(state);
    const ttProbe = globalTT.probe(rootHash, d, -Infinity, Infinity);
    const moves = orderMoves(state, rawMoves, ttProbe.bestMove ?? bestOverallMove);

    let bestScore = -Infinity;
    let bestMoveAtThisDepth = moves[0];

    for (const move of moves) {
      const next = checkWinAfterAction(state, applyAction(state, move), move);
      const score = graphMinimax(
        next,
        d - 1,
        -Infinity,
        Infinity,
        side,
        pathHashes,
        useQuiescence,
      );

      if (score > bestScore) {
        bestScore = score;
        bestMoveAtThisDepth = move;
      }
    }

    bestOverallMove = bestMoveAtThisDepth;

    // Store root state in TT
    globalTT.store(rootHash, d, bestScore, TTFlag.EXACT, bestOverallMove);

    // If a decisive forced win is found, stop early
    if (bestScore >= 90_000) break;
  }

  return bestOverallMove;
}

/**
 * Chooses an action for `side` based on the requested difficulty level.
 *
 * easy:   Depth 2, soft noise
 * medium: Depth 4, TT graph search
 * hard:   Depth 6, TT + Quiescence + Move Ordering
 * master: Depth 8 Iterative Deepening + Full Graph Evaluator + Quiescence
 */
export function chooseAction(
  state: GameState,
  side: Side,
  difficulty: AiDifficulty = 'medium',
): Action | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  // 1. Every difficulty immediately takes an instant king capture win
  const kingCapture = findKingCapture(state, moves);
  if (kingCapture) return kingCapture;

  // 2. High difficulties check for instant entry win
  if (difficulty === 'hard' || difficulty === 'master') {
    const entryWin = findEntryWinningMove(state, moves);
    if (entryWin) return entryWin;
  }

  // Easy mode: Depth 2, random blunder chance
  if (difficulty === 'easy') {
    if (Math.random() < 0.25 && moves.length > 1) {
      // 25% chance to make a random reasonable move
      return pickRandom(moves);
    }
    return searchBestAction(state, side, 2, false);
  }

  // Medium mode: Depth 4 with TT
  if (difficulty === 'medium') {
    return searchBestAction(state, side, 4, false);
  }

  // Hard mode: Depth 6 with TT + Quiescence
  if (difficulty === 'hard') {
    return searchBestAction(state, side, 6, true);
  }

  // Master mode: Depth 8 with Full Iterative Deepening + Quiescence
  return searchBestAction(state, side, 8, true);
}

/**
 * Returns current position advantage score from the perspective of bottom player.
 * Positive = bottom advantage, Negative = top advantage.
 */
export function getGameStateEvaluation(state: GameState): number {
  return evaluateGraph(state, 'bottom');
}
