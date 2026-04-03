import type { Action, Board, Coord, GameState, Side } from '@/types';
import { getLegalMoves } from './rules';

export function findKing(board: Board, side: Side): Coord | null {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece !== null && piece.side === side && piece.type === '王') {
        return { row, col };
      }
    }
  }
  return null;
}

export function isKingOnBoard(board: Board, side: Side): boolean {
  return findKing(board, side) !== null;
}

/**
 * Checks win conditions after an action has been applied.
 *
 * Victory check order:
 * 1. Capture victory: opponent's 王 is no longer on the board.
 * 2. Entry state: acting side's 王 has reached the opponent's last row.
 * 3. Entry victory: if the opponent entered last turn and the current side
 *    cannot capture that 王, the entrant wins.
 */
export function checkWinAfterAction(
  prevState: GameState,
  nextState: GameState,
  _action: Action,
): GameState {
  const actingSide: Side = prevState.currentTurn;
  const opponentSide: Side = actingSide === 'top' ? 'bottom' : 'top';

  // 1. Capture victory
  if (!isKingOnBoard(nextState.board, opponentSide)) {
    return { ...nextState, winner: actingSide, status: 'finished' };
  }

  // 3. Entry victory check:
  //    If the OPPONENT entered on their previous turn (prevState.entryState.side === opponentSide),
  //    the acting side just responded. If they did not capture the entering 王,
  //    the entering side wins.
  if (prevState.entryState !== null && prevState.entryState.side === opponentSide) {
    // The acting side's turn was the opponent's chance to capture — they did not (capture
    // victory above would have caught it). So the entering side wins.
    return { ...nextState, winner: opponentSide, status: 'finished' };
  }

  // 2. Entry state detection: did the acting side's 王 just reach the last row?
  const entryRow = actingSide === 'top' ? 3 : 0;
  const kingCoord = findKing(nextState.board, actingSide);

  if (kingCoord !== null && kingCoord.row === entryRow) {
    return { ...nextState, entryState: { side: actingSide, coord: kingCoord } };
  }

  return nextState;
}

/**
 * Returns updated state with the current player marked as loser if the
 * turn timer has expired.
 */
export function checkTimerExpiry(state: GameState): GameState {
  if (state.status !== 'playing' || state.turnStartedAt === 0) {
    return state;
  }

  const elapsed = Date.now() - state.turnStartedAt;
  if (elapsed <= state.timerDuration * 1000) {
    return state;
  }

  const winner: Side = state.currentTurn === 'top' ? 'bottom' : 'top';
  return { ...state, winner, status: 'finished' };
}
