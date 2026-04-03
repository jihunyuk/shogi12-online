import type { GameMode } from '@/types';
import { LocalGameController } from './localState';

export { LocalGameController };

/** Factory — preferred entry point for UI scenes. */
export function createLocalController(mode: GameMode): LocalGameController {
  return new LocalGameController(mode);
}
