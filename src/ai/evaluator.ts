import type { GameState, PieceType, Side } from '@/types';

const PIECE_VALUE: Record<PieceType, number> = {
  '王': 0,    // win condition — handled separately
  '將': 500,  // rook-equivalent
  '相': 400,  // bishop-equivalent
  '後': 350,  // promoted pawn (gold general)
  '子': 100,  // pawn
};

/**
 * Evaluates the board from the perspective of `side`.
 * Returns large positive for a winning position, large negative for losing.
 */
export function evaluateBoard(state: GameState, side: Side): number {
  if (state.winner === side) return 100_000;
  if (state.winner !== null) return -100_000;

  const opponent: Side = side === 'top' ? 'bottom' : 'top';
  let score = 0;

  // ── Material on board ─────────────────────────────────────────
  for (const row of state.board) {
    for (const cell of row) {
      if (!cell) continue;
      const val = PIECE_VALUE[cell.type];
      score += cell.side === side ? val : -val;
    }
  }

  // ── Material in hand (slightly discounted — not yet deployed) ─
  for (const p of state.reserves[side])     score += Math.floor(PIECE_VALUE[p] * 0.85);
  for (const p of state.reserves[opponent]) score -= Math.floor(PIECE_VALUE[p] * 0.85);

  // ── King advancement bonus ────────────────────────────────────
  // Reward moving own king toward the opponent's back row.
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = state.board[r][c];
      if (!cell || cell.type !== '王') continue;
      const advRow = cell.side === 'top' ? r : (3 - r);
      if (cell.side === side) score += advRow * 15;
      else                    score -= advRow * 15;
    }
  }

  return score;
}
