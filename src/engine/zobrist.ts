import type { GameState, PieceType, Side } from '@/types';

// Deterministic 64-bit PRNG (SplitMix64)
class PRNG64 {
  private state: bigint;

  constructor(seed: bigint = 0x123456789abcdef0n) {
    this.state = seed;
  }

  nextBigInt(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return (z ^ (z >> 31n)) & 0xffffffffffffffffn;
  }
}

const rng = new PRNG64(0x9876543210fedcban);

const PIECE_TYPES: PieceType[] = ['王', '將', '相', '子', '後'];
const PIECE_TYPE_MAP: Record<PieceType, number> = {
  '王': 0,
  '將': 1,
  '相': 2,
  '子': 3,
  '後': 4,
};

const DROPPABLE_PIECES: PieceType[] = ['將', '相', '子', '後'];
const DROPPABLE_MAP: Record<string, number> = {
  '將': 0,
  '相': 1,
  '子': 2,
  '後': 3,
};

// 4 rows x 3 cols x 5 piece types x 2 sides
export const ZOBRIST_BOARD: bigint[][][][] = Array.from({ length: 4 }, () =>
  Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => [rng.nextBigInt(), rng.nextBigInt()])
  )
);

// 2 sides x 4 piece types x 3 counts (0, 1, 2)
export const ZOBRIST_RESERVES: bigint[][][] = Array.from({ length: 2 }, () =>
  Array.from({ length: 4 }, () => [0n, rng.nextBigInt(), rng.nextBigInt()])
);

// Key toggled when it's bottom's turn (or top's turn)
export const ZOBRIST_TURN: bigint = rng.nextBigInt();

/**
 * Computes a 64-bit Zobrist hash representing the unique game state graph node.
 */
export function computeZobristHash(state: GameState): bigint {
  let hash = 0n;

  // 1. Board state
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = state.board[r][c];
      if (cell !== null) {
        const pIdx = PIECE_TYPE_MAP[cell.type];
        const sIdx = cell.side === 'top' ? 0 : 1;
        hash ^= ZOBRIST_BOARD[r][c][pIdx][sIdx];
      }
    }
  }

  // 2. Reserves
  for (const side of ['top', 'bottom'] as Side[]) {
    const sIdx = side === 'top' ? 0 : 1;
    const hand = state.reserves[side];
    const counts: Record<string, number> = { '將': 0, '相': 0, '子': 0, '後': 0 };
    for (const p of hand) {
      if (counts[p] !== undefined) counts[p]++;
    }
    for (const p of DROPPABLE_PIECES) {
      const cnt = Math.min(counts[p], 2);
      if (cnt > 0) {
        const pIdx = DROPPABLE_MAP[p];
        hash ^= ZOBRIST_RESERVES[sIdx][pIdx][cnt];
      }
    }
  }

  // 3. Side to move
  if (state.currentTurn === 'bottom') {
    hash ^= ZOBRIST_TURN;
  }

  return hash;
}

/**
 * Converts 64-bit BigInt hash to a 16-character hexadecimal string.
 */
export function zobristToString(hash: bigint): string {
  return hash.toString(16).padStart(16, '0');
}
