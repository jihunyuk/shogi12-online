import type { Coord, GameState, PieceType, Side } from '@/types';
import { getMoveCandidates } from '@/engine/rules';
import { findKing, isKingInCheck } from '@/engine/winCondition';
import { isInBounds } from '@/engine/gameState';

const PIECE_BOARD_VALUE: Record<PieceType, number> = {
  '王': 0,    // Handled by win condition and king-safety
  '將': 560,  // High mobility orthogonal
  '相': 430,  // Diagonal controller
  '後': 460,  // Gold general equivalent
  '子': 130,  // Chick / Pawn
};

const PIECE_HAND_VALUE: Record<PieceType, number> = {
  '王': 0,
  '將': 520,  // Drops can threaten instant fork/skewer
  '相': 400,
  '後': 0,    // Promoted pieces revert to 子 in hand
  '子': 140,  // Fast drop for block/promotion
};

// Center control bonus for 3x4 board:
// Rows 1 and 2, Col 1 is the heart of the board
const CENTER_BONUS: number[][] = [
  [0, 5, 0],
  [10, 25, 10],
  [10, 25, 10],
  [0, 5, 0],
];

export interface InfluenceGraph {
  topAttacks: number[][];
  bottomAttacks: number[][];
}

/**
 * Builds the attack & control influence graph over the 12 cells.
 */
export function buildInfluenceGraph(state: GameState): InfluenceGraph {
  const topAttacks: number[][] = Array.from({ length: 4 }, () => [0, 0, 0]);
  const bottomAttacks: number[][] = Array.from({ length: 4 }, () => [0, 0, 0]);

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;

      const candidates = getMoveCandidates(state.board, { row: r, col: c }, piece);
      const targetMap = piece.side === 'top' ? topAttacks : bottomAttacks;

      for (const to of candidates) {
        if (isInBounds(to)) {
          targetMap[to.row][to.col]++;
        }
      }
    }
  }

  return { topAttacks, bottomAttacks };
}

/**
 * High-performance graph-based evaluation function for 12 Shogi.
 * Returns a score from the perspective of `evalSide`.
 */
export function evaluateGraph(state: GameState, evalSide: Side): number {
  if (state.status === 'finished') {
    if (state.winner === evalSide) return 100_000;
    if (state.winner === 'draw') return 0;
    if (state.winner !== null) return -100_000;
  }

  const oppSide: Side = evalSide === 'top' ? 'bottom' : 'top';
  let score = 0;

  // 1. Material on Board & Positional Center Bonus
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;

      let val = PIECE_BOARD_VALUE[piece.type];
      val += CENTER_BONUS[r][c];

      // Pawn advance bonus towards opponent's side
      if (piece.type === '子') {
        const adv = piece.side === 'top' ? r : (3 - r);
        val += adv * 20;
      }

      if (piece.side === evalSide) {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  // 2. Material in Hand (Reserves)
  for (const p of state.reserves[evalSide]) {
    score += PIECE_HAND_VALUE[p] || 100;
  }
  for (const p of state.reserves[oppSide]) {
    score -= PIECE_HAND_VALUE[p] || 100;
  }

  // 3. Influence & Threat Graph
  const { topAttacks, bottomAttacks } = buildInfluenceGraph(state);
  const myAttacks = evalSide === 'top' ? topAttacks : bottomAttacks;
  const oppAttacks = evalSide === 'top' ? bottomAttacks : topAttacks;

  // Board control score: having more attacked squares
  let myControlCount = 0;
  let oppControlCount = 0;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (myAttacks[r][c] > 0) myControlCount++;
      if (oppAttacks[r][c] > 0) oppControlCount++;

      // Check for undefended pieces ("En Prise" hanging piece penalty)
      const piece = state.board[r][c];
      if (piece) {
        const isMyPiece = piece.side === evalSide;
        const defenders = isMyPiece ? myAttacks[r][c] : oppAttacks[r][c];
        const attackers = isMyPiece ? oppAttacks[r][c] : myAttacks[r][c];

        if (attackers > 0 && defenders === 0 && piece.type !== '王') {
          // Hanging piece!
          const hangingPenalty = Math.floor(PIECE_BOARD_VALUE[piece.type] * 0.4);
          if (isMyPiece) score -= hangingPenalty;
          else score += hangingPenalty;
        }
      }
    }
  }
  score += (myControlCount - oppControlCount) * 12;

  // 4. King Safety & Flight Graph
  const myKing = findKing(state.board, evalSide);
  const oppKing = findKing(state.board, oppSide);

  if (myKing) {
    // Escape squares calculation
    const kingMoves = getMoveCandidates(state.board, myKing, { type: '王', side: evalSide, promoted: false });
    let safeEscapeCount = 0;
    for (const km of kingMoves) {
      if (isInBounds(km) && oppAttacks[km.row][km.col] === 0) {
        safeEscapeCount++;
      }
    }
    score += safeEscapeCount * 14;

    // Check penalty
    if (isKingInCheck(state.board, evalSide)) {
      score -= 85;
    }
  }

  if (oppKing) {
    const kingMoves = getMoveCandidates(state.board, oppKing, { type: '王', side: oppSide, promoted: false });
    let oppEscapeCount = 0;
    for (const km of kingMoves) {
      if (isInBounds(km) && myAttacks[km.row][km.col] === 0) {
        oppEscapeCount++;
      }
    }
    score -= oppEscapeCount * 14;

    if (isKingInCheck(state.board, oppSide)) {
      score += 85;
    }
  }

  // 5. Try / Entry Rule Graph Distance
  // For top player, entry row is 3. For bottom player, entry row is 0.
  if (myKing) {
    const entryTargetRow = evalSide === 'top' ? 3 : 0;
    const distToEntry = Math.abs(myKing.row - entryTargetRow);
    if (distToEntry === 1) {
      // King is 1 step away from victory!
      // Check if entry square is safe or unguarded
      const canEnter = [0, 1, 2].some(c =>
        Math.abs(c - myKing.col) <= 1 && oppAttacks[entryTargetRow][c] === 0
      );
      if (canEnter) score += 160;
      else score += 60;
    }
  }

  if (oppKing) {
    const oppEntryTargetRow = oppSide === 'top' ? 3 : 0;
    const oppDistToEntry = Math.abs(oppKing.row - oppEntryTargetRow);
    if (oppDistToEntry === 1) {
      const oppCanEnter = [0, 1, 2].some(c =>
        Math.abs(c - oppKing.col) <= 1 && myAttacks[oppEntryTargetRow][c] === 0
      );
      if (oppCanEnter) score -= 160;
      else score -= 60;
    }
  }

  return score;
}
