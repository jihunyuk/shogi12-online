import type { Action, Board, Coord, GameState, Side } from '@/types';
import { getMoveCandidates } from './rules';

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

export function isKingInCheck(board: Board, side: Side): boolean {
  const kingCoord = findKing(board, side);
  if (!kingCoord) return false;
  const opponent: Side = side === 'top' ? 'bottom' : 'top';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = board[r][c];
      if (piece !== null && piece.side === opponent) {
        const moves = getMoveCandidates(board, { row: r, col: c }, piece);
        if (moves.some(m => m.row === kingCoord.row && m.col === kingCoord.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function countRepetitions(history: GameState['moveHistory'], hash: string): number {
  let count = 0;
  for (const m of history) {
    if (m.zobristHash === hash) count++;
  }
  return count;
}

/**
 * Checks win conditions after an action has been applied.
 *
 * Victory check order:
 * 1. Capture victory: opponent's 王 is no longer on the board.
 * 2. Entry victory: if the opponent entered last turn and the current side
 *    cannot capture that 王, the entrant wins.
 * 3. Entry state detection: acting side's 王 has reached the opponent's last row.
 * 4. Repetition (Sennichite / 천일수): if the same state graph node occurred 3 times,
 *    declare a draw (or loss if continuous checks).
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
    return { ...nextState, winner: actingSide, winReason: 'capture', status: 'finished' };
  }

  // 2. Entry victory check:
  //    If the OPPONENT entered on their previous turn (prevState.entryState.side === opponentSide),
  //    the acting side just responded. If they did not capture the entering 王,
  //    the entering side wins.
  if (prevState.entryState !== null && prevState.entryState.side === opponentSide) {
    // The acting side's turn was the opponent's chance to capture — they did not (capture
    // victory above would have caught it). So the entering side wins.
    return { ...nextState, winner: opponentSide, winReason: 'entry', status: 'finished' };
  }

  // 3. Entry state detection: did the acting side's 王 just reach the last row?
  const entryRow = actingSide === 'top' ? 3 : 0;
  const kingCoord = findKing(nextState.board, actingSide);

  let stateWithEntry = nextState;
  if (kingCoord !== null && kingCoord.row === entryRow) {
    stateWithEntry = { ...nextState, entryState: { side: actingSide, coord: kingCoord } };
  }

  // 4. Sennichite (동일 국면 3회 반복 / 천일수) 감지
  const lastRecord = stateWithEntry.moveHistory[stateWithEntry.moveHistory.length - 1];
  if (lastRecord?.zobristHash) {
    const repCount = countRepetitions(stateWithEntry.moveHistory, lastRecord.zobristHash);
    if (repCount >= 3) {
      // 3회 반복 발생 -> 천일수 무승부
      return {
        ...stateWithEntry,
        winner: 'draw',
        winReason: 'repetition',
        status: 'finished',
      };
    }
  }

  return stateWithEntry;
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
  return { ...state, winner, winReason: 'timeout', status: 'finished' };
}
