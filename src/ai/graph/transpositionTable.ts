import type { Action } from '@/types';

export const enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1, // Beta cutoff (fail-high: score >= beta)
  UPPERBOUND = 2, // All moves failed low (score <= alpha)
}

export interface TTEntry {
  hash: bigint;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove: Action | null;
  age: number;
}

export class TranspositionTable {
  private _table: Map<bigint, TTEntry> = new Map();
  private _maxEntries: number;
  private _currentAge = 0;

  constructor(maxEntries = 120_000) {
    this._maxEntries = maxEntries;
  }

  get size(): number {
    return this._table.size;
  }

  clear(): void {
    this._table.clear();
    this._currentAge = 0;
  }

  incrementAge(): void {
    this._currentAge++;
    // Periodically clean up very old entries if reaching capacity
    if (this._table.size >= this._maxEntries) {
      for (const [hash, entry] of this._table.entries()) {
        if (this._currentAge - entry.age > 2) {
          this._table.delete(hash);
        }
      }
    }
  }

  probe(
    hash: bigint,
    depth: number,
    alpha: number,
    beta: number,
  ): { hit: boolean; score?: number; bestMove?: Action | null; cutoff: boolean } {
    const entry = this._table.get(hash);
    if (!entry) {
      return { hit: false, cutoff: false };
    }

    const bestMove = entry.bestMove;

    // Check if the stored entry has sufficient depth for a cutoff
    if (entry.depth >= depth) {
      if (entry.flag === TTFlag.EXACT) {
        return { hit: true, score: entry.score, bestMove, cutoff: true };
      }
      if (entry.flag === TTFlag.LOWERBOUND && entry.score >= beta) {
        return { hit: true, score: entry.score, bestMove, cutoff: true };
      }
      if (entry.flag === TTFlag.UPPERBOUND && entry.score <= alpha) {
        return { hit: true, score: entry.score, bestMove, cutoff: true };
      }
    }

    // Hit but cannot cutoff (useful for move ordering)
    return { hit: true, bestMove, cutoff: false };
  }

  store(
    hash: bigint,
    depth: number,
    score: number,
    flag: TTFlag,
    bestMove: Action | null,
  ): void {
    const existing = this._table.get(hash);
    // Replace if new depth is greater or equal, or if existing entry is older
    if (!existing || depth >= existing.depth || this._currentAge > existing.age) {
      this._table.set(hash, {
        hash,
        depth,
        score,
        flag,
        bestMove: bestMove ?? existing?.bestMove ?? null,
        age: this._currentAge,
      });
    }
  }
}

// Global singleton for the AI engine
export const globalTT = new TranspositionTable();
