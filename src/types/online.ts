import type { Side, GameStatus, PieceType } from './game';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** Matches the Supabase `rooms` table shape. */
export interface Room {
  id: string;
  status: RoomStatus;
  hostId: string;
  guestId: string | null;
  currentTurnPlayerId: string | null;
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches the Supabase `games` table shape. */
export interface OnlineGameRecord {
  id: string;
  roomId: string;
  /** JSON-serialized Board */
  boardState: string;
  /** JSON-serialized PieceType[] */
  capturedTop: string;
  /** JSON-serialized PieceType[] */
  capturedBottom: string;
  currentTurn: Side;
  turnStartedAt: string | null;
  winner: Side | null;
  gameStatus: GameStatus;
  moveCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Metadata for realtime sync validation. */
export interface SyncMeta {
  /** Monotonically increasing version number. */
  version: number;
  /** Unix timestamp (ms) of the last server update. */
  lastUpdatedAt: number;
  /** True when this state came directly from the server. */
  authoritative: boolean;
}

/** Payload sent when submitting a move to the server. */
export interface MoveSubmission {
  roomId: string;
  playerId: string;
  side: Side;
  moveNumber: number;
  moveType: 'move' | 'drop';
  fromRow: number | null;
  fromCol: number | null;
  toRow: number;
  toCol: number;
  pieceType: PieceType;
  promoted: boolean;
  capturedPiece: PieceType | null;
}
