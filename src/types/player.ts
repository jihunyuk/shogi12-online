import type { Side } from './game';

export interface PlayerInfo {
  id: string;
  nickname: string;
  locale: 'ko' | 'en';
  side: Side;
}
