import type { Board, Cell, Coord, GameMode, GameState, Side } from '@/types';

export function createInitialGameState(mode: GameMode, online?: GameState['online']): GameState {
  const board: Board = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  // Top side
  board[0][0] = { type: '相', side: 'top', promoted: false };
  board[0][1] = { type: '王', side: 'top', promoted: false };
  board[0][2] = { type: '將', side: 'top', promoted: false };
  board[1][1] = { type: '子', side: 'top', promoted: false };

  // Bottom side
  board[2][1] = { type: '子', side: 'bottom', promoted: false };
  board[3][0] = { type: '將', side: 'bottom', promoted: false };
  board[3][1] = { type: '王', side: 'bottom', promoted: false };
  board[3][2] = { type: '相', side: 'bottom', promoted: false };

  return {
    board,
    currentTurn: 'top',
    reserves: { top: [], bottom: [] },
    status: 'waiting',
    winner: null,
    moveHistory: [],
    mode,
    turnStartedAt: 0,
    timerDuration: 30,
    entryState: null,
    ...(online !== undefined ? { online } : {}),
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map(row => [...row]) as Board,
    reserves: {
      top: [...state.reserves.top],
      bottom: [...state.reserves.bottom],
    },
    moveHistory: [...state.moveHistory],
    entryState: state.entryState !== null
      ? { side: state.entryState.side, coord: { ...state.entryState.coord } }
      : null,
    ...(state.online !== undefined ? { online: { ...state.online } } : {}),
  };
}

export function getOpponent(side: Side): Side {
  return side === 'top' ? 'bottom' : 'top';
}

export function isInBounds(coord: Coord): boolean {
  return coord.row >= 0 && coord.row <= 3 && coord.col >= 0 && coord.col <= 2;
}

export function getPiece(board: Board, coord: Coord): Cell {
  return board[coord.row][coord.col];
}

export function setPiece(board: Board, coord: Coord, cell: Cell): Board {
  const next = board.map(row => [...row]) as Board;
  next[coord.row][coord.col] = cell;
  return next;
}
