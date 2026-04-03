import type { GameState } from '@/types';

export function getRemainingMs(state: GameState): number {
  if (state.turnStartedAt === 0) {
    return state.timerDuration * 1000;
  }
  const elapsed = Date.now() - state.turnStartedAt;
  return Math.max(0, state.timerDuration * 1000 - elapsed);
}

export function getRemainingSeconds(state: GameState): number {
  return Math.ceil(getRemainingMs(state) / 1000);
}

export function isTimerExpired(state: GameState): boolean {
  return state.turnStartedAt > 0 && getRemainingMs(state) === 0;
}

export function startTimer(state: GameState): GameState {
  return { ...state, turnStartedAt: Date.now() };
}

export function resetTimer(state: GameState): GameState {
  return { ...state, turnStartedAt: 0 };
}
