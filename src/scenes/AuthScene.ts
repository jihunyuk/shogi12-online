/**
 * AuthScene — Google OAuth (Supabase) 전용 인증 씬
 *
 * 흐름:
 *   기존 세션 있음 → 프로필 확인 → (닉네임 미설정이면 Setup) → Matchmaking
 *   기존 세션 없음 → "Sign in with Google" 버튼 표시 → signInWithOAuth → 리디렉션 후 세션 감지
 */

import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { supabase } from '@/online/supabaseClient';
import { t } from '@/i18n';

export class AuthScene extends Phaser.Scene {
  private _statusText: Phaser.GameObjects.Text | null = null;
  private _pollTimer: Phaser.Time.TimerEvent | null = null;

  constructor() { super({ key: 'Auth' }); }

  create(): void {
    this.cameras.main.fadeIn(400, 30, 15, 7);
    this._drawBase();

    this._statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.textSecondary,
      align: 'center',
    }).setOrigin(0.5).setDepth(5);

    void this._check();
  }

  shutdown(): void {
    this._pollTimer?.destroy();
    this._pollTimer = null;
  }

  private _setStatus(msg: string): void {
    this._statusText?.setText(msg);
  }

  // ── 진입 체크 ─────────────────────────────────────────────────────

  private async _check(): Promise<void> {
    if (!supabase) {
      this._drawError(t('auth.noSupabase'));
      return;
    }

    this._setStatus(t('auth.checkingSession'));
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      this._setStatus(t('auth.loadingProfile'));
      await this._loadProfile(session.user.id, session.user.user_metadata?.['full_name'] ?? '');
    } else {
      this._drawLoginUI();
    }
  }

  // ── 프로필 로더 ───────────────────────────────────────────────────

  private async _loadProfile(userId: string, googleName: string): Promise<void> {
    const { data: profile } = await supabase!
      .from('profiles')
      .select('nickname, country_code')
      .eq('id', userId)
      .single();

    const nick    = ((profile?.nickname     as string | undefined) ?? '').trim();
    const country = ((profile?.country_code as string | undefined) ?? '').trim();

    if (!nick || !country) {
      this._showSetup(userId, googleName, nick, country);
    } else {
      this._drawReadyUI(nick);
    }
  }

  // ── 이동 ──────────────────────────────────────────────────────────

  private _goMatchmaking(): void {
    this._pollTimer?.destroy();
    this.cameras.main.fadeOut(300, 30, 15, 7);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Matchmaking'));
  }

  // ── 배경 (공통) ───────────────────────────────────────────────────

  private _drawBase(): void {
    const cx = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.background, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const grain = this.add.graphics();
    grain.lineStyle(1, 0xffffff, 0.012);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0); grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // Header bar
    const hdr = this.add.graphics();
    hdr.fillStyle(COLORS.hudBg, 1);
    hdr.fillRect(0, 0, GAME_WIDTH, 58);
    hdr.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    hdr.moveTo(0, 58); hdr.lineTo(GAME_WIDTH, 58); hdr.strokePath();

    // 뒤로가기
    this.add.text(16, 29, '←', { fontSize: '26px', color: COLORS.textGold })
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this._pollTimer?.destroy();
        this.cameras.main.fadeOut(250, 30, 15, 7);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
      });

    this.add.text(cx, 29, t('auth.title'), {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.hud,
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ── State A: 로그인 화면 ──────────────────────────────────────────

  private _drawLoginUI(): void {
    const cx = GAME_WIDTH / 2;
    const cardW = 300, cardH = 220, cardX = cx - cardW / 2, cardY = 100;

    // 카드 배경
    const card = this.add.graphics();
    [3, 2, 1].forEach(i => {
      card.fillStyle(0x000000, 0.10 * i);
      card.fillRoundedRect(cardX + i * 2, cardY + i * 3, cardW, cardH, 10);
    });
    card.fillStyle(0x2a1208, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);

    // 타이틀
    this.add.text(cx, cardY + 36, t('menu.onlineMatch'), {
      fontFamily: FONT_FAMILY, fontSize: '18px',
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cardY + 64, t('auth.googleSubtitle'), {
      fontFamily: FONT_FAMILY, fontSize: '12px',
      color: COLORS.textSecondary, align: 'center',
    }).setOrigin(0.5).setDepth(2);

    // 구분선
    const div = this.add.graphics().setDepth(2);
    div.lineStyle(1, COLORS.textGoldNum, 0.2);
    div.moveTo(cardX + 20, cardY + 96); div.lineTo(cardX + cardW - 20, cardY + 96);
    div.strokePath();

    // Google 로그인 버튼
    const btnY = cardY + 148;
    this._createGoogleButton(cx, btnY);
  }

  private _createGoogleButton(cx: number, y: number): void {
    const w = 260, h = 50;

    const bgGfx = this.add.graphics().setDepth(3);
    const draw = (hover: boolean) => {
      bgGfx.clear();
      bgGfx.fillStyle(0x000000, 0.3);
      bgGfx.fillRoundedRect(cx - w / 2 + 2, y - h / 2 + 3, w, h, 8);
      bgGfx.fillStyle(hover ? 0xffffff : 0xf0f0f0, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 8);
      bgGfx.lineStyle(hover ? 2 : 1.5, 0x4285F4, hover ? 1 : 0.7);
      bgGfx.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 8);
    };
    draw(false);

    // "G" 로고 원
    const logoGfx = this.add.graphics().setDepth(4);
    logoGfx.fillStyle(0x4285F4, 1); logoGfx.fillCircle(cx - w / 2 + 28, y, 12);
    this.add.text(cx - w / 2 + 28, y, 'G', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    this.add.text(cx + 8, y, t('auth.googleLogin'), {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true }).setDepth(5);
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerup',   () => void this._startGoogleLogin());
  }

  private async _startGoogleLogin(): Promise<void> {
    if (!supabase) return;
    this._setStatus(t('auth.openingGoogle'));

    const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_URL || (window.location.origin + window.location.pathname);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      this._setStatus(t('auth.error').replace('{msg}', error.message));
      return;
    }

    // 리디렉션 후 세션이 복원될 때까지 폴링
    this._setStatus(t('auth.awaitingRedirect'));
    this._pollSession();
  }

  /** 로그인 팝업/리디렉션 후 세션이 생기면 자동 진행 */
  private _pollSession(): void {
    this._pollTimer = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: async () => {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user) {
          this._pollTimer?.destroy();
          await this._loadProfile(session.user.id, session.user.user_metadata?.['full_name'] ?? '');
        }
      },
    });
  }

  // ── State B: 닉네임/국가 설정 ──────────────────────────────────────

  private _showSetup(userId: string, googleName: string, existingNick: string, existingCountry: string): void {
    this.children.removeAll(true);
    this._drawBase();

    const cx = GAME_WIDTH / 2;
    let nick    = existingNick    || googleName.slice(0, 20);
    let country = existingCountry || 'KR';

    this._statusText = this.add.text(cx, GAME_HEIGHT - 24, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(5);

    const cardW = 300, cardH = 320, cardX = cx - cardW / 2, cardY = 80;

    const card = this.add.graphics();
    [3, 2, 1].forEach(i => {
      card.fillStyle(0x000000, 0.10 * i);
      card.fillRoundedRect(cardX + i * 2, cardY + i * 3, cardW, cardH, 10);
    });
    card.fillStyle(0x2a1208, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);

    this.add.text(cx, cardY + 28, t('profile.setupTitle'), {
      fontFamily: FONT_FAMILY, fontSize: '17px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // 닉네임 입력 (HTML input 사용)
    this.add.text(cardX + 20, cardY + 70, t('profile.nicknameLabel'), {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary,
    }).setDepth(2);

    const inputEl = document.createElement('input');
    inputEl.type = 'text'; inputEl.maxLength = 20;
    inputEl.value = nick;
    inputEl.placeholder = t('profile.nicknamePlaceholder');
    Object.assign(inputEl.style, {
      width: `${cardW - 40}px`, height: '36px',
      background: '#1a0f06', color: '#fff', border: '1px solid #c8a020',
      borderRadius: '6px', fontSize: '15px', padding: '0 10px',
      fontFamily: FONT_FAMILY, outline: 'none',
    });
    const domInput = this.add.dom(cx, cardY + 88, inputEl).setDepth(10);
    inputEl.addEventListener('input', () => { nick = inputEl.value.trim(); });

    // 국가 선택 (간단 드롭다운)
    this.add.text(cardX + 20, cardY + 140, t('profile.countryLabel'), {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary,
    }).setDepth(2);

    const selectEl = document.createElement('select');
    const countries = [
      ['KR', '🇰🇷 한국'], ['US', '🇺🇸 USA'], ['JP', '🇯🇵 日本'],
      ['CN', '🇨🇳 中国'], ['GB', '🇬🇧 UK'], ['DE', '🇩🇪 Germany'],
      ['FR', '🇫🇷 France'], ['BR', '🇧🇷 Brasil'], ['OTHER', '🌐 기타'],
    ];
    countries.forEach(([code, label]) => {
      const opt = document.createElement('option');
      opt.value = code; opt.textContent = label;
      if (code === country) opt.selected = true;
      selectEl.appendChild(opt);
    });
    Object.assign(selectEl.style, {
      width: `${cardW - 40}px`, height: '36px',
      background: '#1a0f06', color: '#fff', border: '1px solid #c8a020',
      borderRadius: '6px', fontSize: '15px', padding: '0 8px',
      fontFamily: FONT_FAMILY, outline: 'none',
    });
    const domSelect = this.add.dom(cx, cardY + 158, selectEl).setDepth(10);
    selectEl.addEventListener('change', () => { country = selectEl.value; });

    const cleanup = () => {
      domInput.destroy();
      domSelect.destroy();
    };

    // 확인 버튼
    const confirmY = cardY + 265;
    this._createButton(cx, confirmY, t('profile.complete'), async () => {
      const finalNick = nick.trim();
      if (!finalNick) { this._setStatus(t('profile.nicknameMin')); return; }
      this._setStatus(t('profile.saving'));
      const { error } = await supabase!.from('profiles').upsert({
        id: userId,
        nickname: finalNick,
        country_code: country,
        // email, rating are NOT NULL bounded, supabase API insert assumes default when missing, but it is safer to specify if it breaks!
        email: '',
        rating: 1200,
      });
      if (error) { 
        if (error.code === '23505') { // Postgres Unique Violation
          this._setStatus(t('profile.duplicateNick'));
        } else {
          this._setStatus(t('auth.error').replace('{msg}', error.message)); 
        }
        return; 
      }
      cleanup();
      this._drawReadyUI(finalNick);
    }, COLORS.textGoldNum);

    // 씬 이탈 시 HTML 요소 제거
    this.events.once('shutdown', cleanup);
    this.events.once('destroy',  cleanup);
  }

  // ── State C: 로그인 완료 / 준비 화면 ─────────────────────────────

  private _drawReadyUI(nickname: string): void {
    this.children.removeAll(true);
    this._drawBase();

    const cx = GAME_WIDTH / 2;

    this._statusText = this.add.text(cx, GAME_HEIGHT - 24, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(5);

    const cardW = 300, cardH = 200, cardX = cx - cardW / 2, cardY = 100;

    const card = this.add.graphics();
    [3, 2, 1].forEach(i => {
      card.fillStyle(0x000000, 0.10 * i);
      card.fillRoundedRect(cardX + i * 2, cardY + i * 3, cardW, cardH, 10);
    });
    card.fillStyle(0x2a1208, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(1.5, COLORS.textGoldNum, 0.6);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);

    this.add.text(cx, cardY + 36, `✓  ${nickname}`, {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cardY + 70, t('auth.loginComplete'), {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(2);

    this._createButton(cx, cardY + 148, t('auth.playOnline'), () => this._goMatchmaking(), COLORS.textGoldNum);

    // 로그아웃
    this.add.text(cx, cardY + cardH + 24, t('auth.logout'), {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true })
      .on('pointerup', async () => {
        await supabase!.auth.signOut();
        this.scene.restart();
      });
  }

  // ── 에러 카드 ────────────────────────────────────────────────────

  private _drawError(msg: string): void {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, GAME_HEIGHT / 2, msg, {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: '#ff6666',
      align: 'center', wordWrap: { width: 280 },
    }).setOrigin(0.5).setDepth(5);
  }

  // ── 공용 버튼 ────────────────────────────────────────────────────

  private _createButton(cx: number, y: number, label: string, onClick: () => void, accent: number): void {
    const w = 240, h = 50;
    const bgGfx = this.add.graphics().setDepth(3);

    const draw = (hover: boolean) => {
      bgGfx.clear();
      bgGfx.fillStyle(0x000000, 0.3);
      bgGfx.fillRoundedRect(cx - w / 2 + 2, y - h / 2 + 3, w, h, 8);
      bgGfx.fillStyle(hover ? 0x4a2810 : 0x2a1208, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 8);
      bgGfx.lineStyle(hover ? 2.5 : 1.5, accent, hover ? 1 : 0.7);
      bgGfx.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 8);
      bgGfx.fillStyle(accent, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, 4, h, { tl: 8, bl: 8, tr: 0, br: 0 });
    };
    draw(false);

    this.add.text(cx + 4, y, label, {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true }).setDepth(5);
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerup',   onClick);
  }
}
