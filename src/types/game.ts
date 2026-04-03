export type PieceType = '王' | '將' | '相' | '子' | '後';

export type Side = 'top' | 'bottom';

export type GameMode = 'local' | 'ai' | 'online';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Piece {
  type: PieceType;
  side: Side;
  promoted: boolean;
}

export type Cell = Piece | null;

export type Board = [
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
];

export interface Coord {
  row: number;
  col: number;
}

export interface MoveAction {
  kind: 'move';
  from: Coord;
  to: Coord;
  promotion?: boolean;
}

export interface DropAction {
  kind: 'drop';
  piece: PieceType;
  to: Coord;
}

export type Action = MoveAction | DropAction;

export interface MoveRecord {
  moveNumber: number;
  side: Side;
  action: Action;
  capturedPiece?: PieceType;
  timestamp: number;
}

export interface GameState {
  /** Current board state, row 0 = top, row 3 = bottom. */
  board: Board;

  /** Which side's turn it is to act. */
  currentTurn: Side;

  /** Captured pieces available for drop, keyed by side. */
  reserves: Record<Side, PieceType[]>;

  /** Overall lifecycle status of the game. */
  status: GameStatus;

  /** The side that won, or null if the game is not yet finished. */
  winner: Side | null;

  /** Ordered list of all moves made in the game. */
  moveHistory: MoveRecord[];

  /** Game mode determining opponent type. */
  mode: GameMode;

  /** Unix timestamp (ms) when the current turn's timer started. */
  turnStartedAt: number;

  /** Per-turn time limit in seconds (always 30). */
  timerDuration: number;

  /**
   * If a player's 王 has entered the opponent's last row,
   * records which side and where the king is. Null otherwise.
   */
  entryState: { side: Side; coord: Coord } | null;

  /** Present only when mode === 'online'. */
  online?: {
    /** The room identifier for the current online match. */
    roomId: string;
    /** This client's side in the online match. */
    playerSide: Side;
    /** Opponent's user id, null until opponent joins. */
    opponentId: string | null;
    /** Monotonically increasing version used to detect out-of-order updates. */
    syncVersion: number;
  };
}
