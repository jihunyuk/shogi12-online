import Phaser from 'phaser';
import { buildPhaserConfig } from '@/config/phaserConfig';
import { BootScene }         from '@/scenes/BootScene';
import { MenuScene }         from '@/scenes/MenuScene';
import { AuthScene }         from '@/scenes/AuthScene';
import { MatchmakingScene }  from '@/scenes/MatchmakingScene';
import { GameScene }         from '@/scenes/GameScene';
import { RulesScene }        from '@/scenes/RulesScene';
import { ResultScene }       from '@/scenes/ResultScene';
import { SettingsScene }     from '@/scenes/SettingsScene';
import { RankingScene }      from '@/scenes/RankingScene';
import { App }               from '@capacitor/app';
import { AdsService }        from '@/ads/adsService';
import { supabase }          from '@/online/supabaseClient';

new Phaser.Game(buildPhaserConfig([
  BootScene,
  MenuScene,
  AuthScene,
  MatchmakingScene,
  GameScene,
  RulesScene,
  ResultScene,
  SettingsScene,
  RankingScene,
]));

// ── Native Mobile Initialization ──────────────────────────────────
// 광고 서비스 초기화
void AdsService.init();

// 딥링크 처리 (Supabase 구글 로그인 등)
App.addListener('appUrlOpen', (data: any) => {
  console.log('[App] Opened with URL:', data.url);
  
  // supabase PKCE 또는 해시 기반 인증 처리 지원
  if (supabase && data.url.includes('login-callback')) {
    // Capacitor에서 외부 브라우저를 통해 인증 후 돌아오면 
    // supabase.auth.getSession() 등이 내부적으로 처리되거나 처리가 필요할 수 있음
    // 여기서는 단순히 로그를 남기고, 필요시 수동 세팅 로직을 추가할 수 있습니다.
  }
});
