import type { Action, AiDifficulty, Coord, DropAction, GameMode, GameState, PieceType, Side } from '@/types';
import { createInitialGameState, cloneGameState, getOpponent } from '@/engine/gameState';
import { isLegalAction, applyAction, getLegalMoves } from '@/engine/rules';
import { checkWinAfterAction, checkTimerExpiry } from '@/engine/winCondition';
import { startTimer, isTimerExpired } from '@/engine/timer';
import { chooseAction } from '@/ai/ai';

const AI_SIDE: Side = 'top';
const AI_THINK_DELAY_MS = 500;

export class LocalGameController {
  private _state: GameState;
  private readonly _mode: GameMode;
  private readonly _difficulty: AiDifficulty;
  private _selectedCoord: Coord | null = null;
  private _aiThinking = false;

  /** UI callback — fired on every state change. */
  onStateChange: ((state: GameState) => void) | null = null;

  constructor(mode: GameMode, difficulty: AiDifficulty = 'medium') {
    this._mode = mode;
    this._difficulty = difficulty;
    this._state = createInitialGameState(mode);
  }

  get state(): GameState {
    return this._state;
  }

  startGame(): void {
    this._state = startTimer({ ...createInitialGameState(this._mode), status: 'playing' });
    this.onStateChange?.(this._state);

    // If AI goes first (top), trigger immediately
    if (this._mode === 'ai' && this._state.currentTurn === AI_SIDE) {
      this._scheduleAIMove();
    }
  }

  /** Validates and applies a human action. Returns false if the action is illegal. */
  submitAction(action: Action): boolean {
    if (this._state.status !== 'playing') return false;
    if (this._mode === 'ai' && this._state.currentTurn === AI_SIDE) return false;
    if (!isLegalAction(this._state, action)) return false;

    this._applyAndAdvance(action);

    // After human move in AI mode, schedule AI response
    if (
      this._mode === 'ai' &&
      this._state.status === 'playing' &&
      this._state.currentTurn === AI_SIDE
    ) {
      this._scheduleAIMove();
    }

    return true;
  }

  /** Call on a regular interval (e.g. every 500ms) to check timer expiry. */
  tick(): void {
    if (this._state.status !== 'playing') return;

    if (isTimerExpired(this._state)) {
      this._state = checkTimerExpiry(this._state);
      this.onStateChange?.(this._state);
      return;
    }

    // Re-trigger AI if it somehow missed its turn
    if (this._mode === 'ai' && this._state.currentTurn === AI_SIDE && !this._aiThinking) {
      this._scheduleAIMove();
    }
  }

  getSelectedCoord(): Coord | null {
    return this._selectedCoord;
  }

  selectCoord(coord: Coord | null): void {
    this._selectedCoord = coord;
  }

  /** Returns all valid drop target cells for the given reserve piece. */
  getLegalDropTargets(piece: PieceType): Coord[] {
    if (this._state.status !== 'playing') return [];
    return getLegalMoves(this._state)
      .filter((a): a is DropAction => a.kind === 'drop' && a.piece === piece)
      .map(a => a.to);
  }

  /** Returns legal move actions originating from the currently selected coord. */
  getLegalMovesForSelected(): Action[] {
    if (this._selectedCoord === null || this._state.status !== 'playing') return [];
    const { row, col } = this._selectedCoord;
    return getLegalMoves(this._state).filter(action => {
      if (action.kind === 'drop') return false;
      return action.from.row === row && action.from.col === col;
    });
  }

  reset(): void {
    this._state = createInitialGameState(this._mode);
    this._selectedCoord = null;
    this._aiThinking = false;
    this.onStateChange?.(this._state);
  }

  // ---- private ----

  private _applyAndAdvance(action: Action): void {
    const prevState = this._state;
    let next = applyAction(cloneGameState(prevState), action);
    next = checkWinAfterAction(prevState, next, action);
    this._state = next;
    this._selectedCoord = null;
    this.onStateChange?.(this._state);
  }

  /** Schedules an AI move after a short delay to simulate thinking. */
  private _scheduleAIMove(): void {
    this._aiThinking = true;

    setTimeout(() => {
      if (this._state.status !== 'playing' || this._state.currentTurn !== AI_SIDE) {
        this._aiThinking = false;
        return;
      }

      const action = chooseAction(this._state, AI_SIDE, this._difficulty);
      if (action !== null) {
        this._applyAndAdvance(action);
      }

      this._aiThinking = false;
    }, AI_THINK_DELAY_MS);
  }
}
