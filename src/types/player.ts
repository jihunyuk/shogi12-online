import type { Side } from './game';

export interface PlayerInfo {
  id: string;
  nickname: string;
  locale: 'ko' | 'en';
  side: Side;
}

/** Profile snapshot used for HUD display and ELO tracking. */
export interface PlayerProfile {
  id: string;
  nickname: string;
  rating: number;
  countryCode: string;
}
