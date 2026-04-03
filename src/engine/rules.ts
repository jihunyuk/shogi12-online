import type { Action, Board, Coord, DropAction, GameState, MoveAction, Piece, PieceType } from '@/types';
import { cloneGameState, getOpponent, getPiece, isInBounds, setPiece } from './gameState';

export function getMoveCandidates(board: Board, coord: Coord, piece: Piece): Coord[] {
  const { type, side } = piece;
  const { row, col } = coord;
  const forward = side === 'top' ? 1 : -1;
  const candidates: Coord[] = [];

  switch (type) {
    case '王':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          candidates.push({ row: row + dr, col: col + dc });
        }
      }
      break;

    case '將':
      candidates.push(
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      );
      break;

    case '相':
      candidates.push(
        { row: row - 1, col: col - 1 },
        { row: row - 1, col: col + 1 },
        { row: row + 1, col: col - 1 },
        { row: row + 1, col: col + 1 },
      );
      break;

    case '子':
      candidates.push({ row: row + forward, col });
      break;

    case '後':
      // Orthogonal (4) + forward diagonals (2) = 6 directions, no backward diagonals
      candidates.push(
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
        { row: row + forward, col: col - 1 },
        { row: row + forward, col: col + 1 },
      );
      break;
  }

  return candidates;
}

export function getLegalMoves(state: GameState): Action[] {
  const { board, currentTurn, reserves } = state;
  const actions: Action[] = [];

  // Move actions
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = board[row][col];
      if (cell === null || cell.side !== currentTurn) continue;

      const from: Coord = { row, col };
      const candidates = getMoveCandidates(board, from, cell);

      for (const to of candidates) {
        if (!isInBounds(to)) continue;
        const target = getPiece(board, to);
        if (target !== null && target.side === currentTurn) continue;

        const promotionRow = currentTurn === 'top' ? 3 : 0;
        const canPromote = cell.type === '子' && to.row === promotionRow;

        if (canPromote) {
          actions.push({ kind: 'move', from, to, promotion: true } satisfies MoveAction);
          actions.push({ kind: 'move', from, to, promotion: false } satisfies MoveAction);
        } else {
          actions.push({ kind: 'move', from, to } satisfies MoveAction);
        }
      }
    }
  }

  // Drop actions
  const hand = reserves[currentTurn];
  const unique = [...new Set(hand)];

  for (const pieceType of unique) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] === null) {
          actions.push({ kind: 'drop', piece: pieceType, to: { row, col } } satisfies DropAction);
        }
      }
    }
  }

  return actions;
}

export function isLegalAction(state: GameState, action: Action): boolean {
  return getLegalMoves(state).some(legal => {
    if (legal.kind !== action.kind) return false;
    if (legal.kind === 'move' && action.kind === 'move') {
      return (
        legal.from.row === action.from.row &&
        legal.from.col === action.from.col &&
        legal.to.row === action.to.row &&
        legal.to.col === action.to.col &&
        (legal.promotion ?? false) === (action.promotion ?? false)
      );
    }
    if (legal.kind === 'drop' && action.kind === 'drop') {
      return (
        legal.piece === action.piece &&
        legal.to.row === action.to.row &&
        legal.to.col === action.to.col
      );
    }
    return false;
  });
}

export function applyAction(state: GameState, action: Action): GameState {
  const next = cloneGameState(state);
  const { currentTurn } = state;
  const opponent = getOpponent(currentTurn);
  const moveNumber = state.moveHistory.length + 1;

  let capturedPiece: PieceType | undefined;

  if (action.kind === 'move') {
    const { from, to, promotion } = action;
    const moving = getPiece(next.board, from) as Piece;
    const target = getPiece(next.board, to);

    if (target !== null) {
      // 後 demotes back to 子 when captured
      capturedPiece = target.type === '後' ? '子' : target.type;
      next.reserves[currentTurn].push(capturedPiece);
    }

    const finalType: PieceType = promotion === true && moving.type === '子' ? '後' : moving.type;
    const promoted = finalType === '後';

    next.board = setPiece(next.board, to, { type: finalType, side: currentTurn, promoted });
    next.board = setPiece(next.board, from, null);
  } else {
    const { piece: pieceType, to } = action;
    const idx = next.reserves[currentTurn].indexOf(pieceType);
    if (idx !== -1) next.reserves[currentTurn].splice(idx, 1);
    next.board = setPiece(next.board, to, { type: pieceType, side: currentTurn, promoted: false });
  }

  next.moveHistory.push({
    moveNumber,
    side: currentTurn,
    action,
    ...(capturedPiece !== undefined ? { capturedPiece } : {}),
    timestamp: Date.now(),
  });

  next.currentTurn = opponent;
  next.turnStartedAt = Date.now();

  return next;
}
