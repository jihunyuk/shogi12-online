import type { AiDifficulty, GameMode } from '@/types';
import { LocalGameController } from './localState';
import { OnlineGameController } from '@/online/syncManager';
import { supabase } from '@/online/supabaseClient';

export { LocalGameController, OnlineGameController };

/** 
 * Factory — preferred entry point for UI scenes.
 * For online mode, it requires the current authenticated user ID.
 */
export async function createController(mode: GameMode, difficulty: AiDifficulty = 'medium'): Promise<LocalGameController | OnlineGameController> {
  if (mode === 'online') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated for online play');
    return new OnlineGameController(user.id);
  }

  return new LocalGameController(mode, difficulty);
}
