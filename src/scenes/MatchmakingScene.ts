/**
 * MatchmakingScene — Supabase 기반 온라인 매칭 대기 씬 (티켓/광고 로직 포함)
 *
 * 흐름:
 *   1. 유저 인증 확인 및 일일 티켓 현황 조회 (get_daily_tickets)
 *   2. 잔여 티켓이 있으면 [매칭 찾기] / 없으면 [광고 보고 1판] 버튼 노출
 *   3. [매칭 찾기] 시 consume_ticket 후 OnlineGameController.findMatch()
 *   4. [광고 보기] 시 AdsService.showRewarded() -> grant_ad_ticket 후 상태 갱신
 */

import Phaser from 'phaser';
import { t } from '@/i18n';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { supabase } from '@/online/supabaseClient';
import { OnlineGameController } from '@/state/stateManager';
import { AdsService } from '@/ads/adsService';

export class MatchmakingScene extends Phaser.Scene {
  private _cancelled = false;
  private _controller: OnlineGameController | null = null;
  private _playerId = '';

  private _ticketsUsed = 0;
  private _adBonus = 0;
  private _maxTickets = 5;

  private _uiContainer!: Phaser.GameObjects.Container;
  private _statusText!: Phaser.GameObjects.Text;
  private _actionBtnZone!: Phaser.GameObjects.Zone;
  private _actionBtnGfx!: Phaser.GameObjects.Graphics;
  private _actionBtnText!: Phaser.GameObjects.Text;

  private _dots!: Phaser.GameObjects.Text;
  private _ticketText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'Matchmaking' }); }

  create(): void {
    this._cancelled = false;
    this._controller = null;
    this._ticketsUsed = 0;
    this._adBonus = 0;
    this._maxTickets = 5;

    this.cameras.main.fadeIn(400, 30, 15, 7);
    this._drawBaseUI();
    void this._initLobby();
  }

  shutdown(): void {
    this._cancelled = true;
    void this._controller?.cancelSearch?.();
    this._controller = null;
  }

  // ── 데이터 연동 ──────────────────────────────────────────────────

  private async _initLobby(): Promise<void> {
    if (!supabase) { this._goMenu(); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || this._cancelled) { this._goMenu(); return; }
    
    this._playerId = user.id;
    this._statusText.setText(t('matchmaking.loading'));
    
    await this._fetchTickets();
  }

  private async _fetchTickets(): Promise<void> {
    if (this._cancelled) return;
    try {
      const { data, error } = await supabase!.rpc('get_daily_tickets', { p_player_id: this._playerId });
      if (error) throw error;

      if (data && data.length > 0) {
        this._ticketsUsed = data[0].tickets_used ?? 0;
        this._adBonus     = data[0].ad_bonus ?? 0;
      }
      this._maxTickets = 5 + this._adBonus;
      this._updateUIAfterFetch();
    } catch (err) {
      console.error('Fetch tickets error:', err);
      this._statusText.setText(t('matchmaking.error'));
    }
  }

  // ── UI 그리기 ────────────────────────────────────────────────────

  private _drawBaseUI(): void {
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

    const hdr = this.add.graphics();
    hdr.fillStyle(COLORS.hudBg, 1);
    hdr.fillRect(0, 0, GAME_WIDTH, 58);
    hdr.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    hdr.moveTo(0, 58); hdr.lineTo(GAME_WIDTH, 58); hdr.strokePath();

    this.add.text(16, 29, '←', { fontSize: '26px', color: COLORS.textGold })
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._goMenu());

    this.add.text(cx, 29, t('matchmaking.ratingBased'), {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.hud,
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5);

    const trophyX = GAME_WIDTH - 30;
    const trophyY = 29;
    const trophyBtn = this.add.graphics();
    trophyBtn.fillStyle(0x000000, 0.4);
    trophyBtn.fillCircle(trophyX, trophyY, 18);
    trophyBtn.lineStyle(2, COLORS.textGoldNum, 1);
    trophyBtn.strokeCircle(trophyX, trophyY, 18);

    this.add.text(trophyX, trophyY, '🏆', { fontSize: '20px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        trophyBtn.clear();
        trophyBtn.fillStyle(0x4a2810, 0.6);
        trophyBtn.fillCircle(trophyX, trophyY, 18);
        trophyBtn.lineStyle(2.5, 0xffffff, 1);
        trophyBtn.strokeCircle(trophyX, trophyY, 18);
      })
      .on('pointerout', () => {
        trophyBtn.clear();
        trophyBtn.fillStyle(0x000000, 0.4);
        trophyBtn.fillCircle(trophyX, trophyY, 18);
        trophyBtn.lineStyle(2, COLORS.textGoldNum, 1);
        trophyBtn.strokeCircle(trophyX, trophyY, 18);
      })
      .on('pointerup', () => {
        this.cameras.main.fadeOut(250, 30, 15, 7);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Ranking'));
      });

    const cardW = 320, cardH = 340, cardX = cx - cardW / 2, cardY = 90;
    const card = this.add.graphics();
    [3, 2, 1].forEach(i => {
      card.fillStyle(0x000000, 0.10 * i);
      card.fillRoundedRect(cardX + i * 2, cardY + i * 3, cardW, cardH, 10);
    });
    card.fillStyle(0x2a1208, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(1.5, COLORS.textGoldNum, 0.4);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);

    this._drawSpinner(cx, cardY + 70);

    this._uiContainer = this.add.container(0, 0).setDepth(2);

    this._statusText = this.add.text(cx, cardY + 130, '', {
      fontFamily: FONT_FAMILY, fontSize: '14px',
      color: COLORS.textWhite, fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this._uiContainer.add(this._statusText);

    this._ticketText = this.add.text(cx, cardY + 160, '', {
      fontFamily: FONT_FAMILY, fontSize: '13px',
      color: '#c8a45a', align: 'center',
    }).setOrigin(0.5);
    this._uiContainer.add(this._ticketText);

    this._dots = this.add.text(cx, cardY + 190, '● ● ●', {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: COLORS.textSecondary,
    }).setOrigin(0.5).setVisible(false);
    this._uiContainer.add(this._dots);

    this.tweens.add({
      targets: this._dots, alpha: 0.2, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // 동적 액션 버튼 (매칭 찾기 / 광고 보기)
    this._actionBtnGfx = this.add.graphics();
    this._uiContainer.add(this._actionBtnGfx);

    this._actionBtnText = this.add.text(cx, cardY + 215, '', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5);
    this._uiContainer.add(this._actionBtnText);

    this._actionBtnZone = this.add.zone(cx, cardY + 215, 240, 50).setInteractive({ useHandCursor: true });
    this._uiContainer.add(this._actionBtnZone);

    // 취소/돌아가기 버튼
    const cancelY = cardY + 300;
    const cancelGfx = this.add.graphics();
    const drawCancel = (hover: boolean) => {
      cancelGfx.clear();
      cancelGfx.fillStyle(hover ? 0x5a2020 : 0x2a1208, 1);
      cancelGfx.fillRoundedRect(cx - 90, cancelY - 18, 180, 36, 6);
      cancelGfx.lineStyle(hover ? 2.5 : 2, hover ? 0xff6666 : 0xcc5555, hover ? 1 : 0.8);
      cancelGfx.strokeRoundedRect(cx - 90, cancelY - 18, 180, 36, 6);
    };
    drawCancel(false);
    this._uiContainer.add(cancelGfx);

    this._uiContainer.add(this.add.text(cx, cancelY, t('matchmaking.cancel'), {
       fontFamily: FONT_FAMILY, fontSize: '14px', color: '#ffaaaa', fontStyle: 'bold',
    }).setOrigin(0.5));

    const cancelZone = this.add.zone(cx, cancelY, 180, 36).setInteractive({ useHandCursor: true });
    cancelZone.on('pointerover', () => drawCancel(true));
    cancelZone.on('pointerout',  () => drawCancel(false));
    cancelZone.on('pointerup',   () => void this._cancel());
    this._uiContainer.add(cancelZone);
  }

  private _drawSpinner(cx: number, cy: number): void {
    const gfx = this.add.graphics().setDepth(2);
    const size = 32, gap = 5, cols = 3;
    const ox = cx - (cols * (size + gap) - gap) / 2;
    const pieces: [string, boolean][] = [['相', false], ['王', true], ['將', false]];

    pieces.forEach(([ch, isRed], i) => {
      const tx = ox + i * (size + gap);
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillRoundedRect(tx + 2, cy - size / 2 + 2, size, size, 4);
      gfx.fillStyle(0xfaf5e6, 1);
      gfx.fillRoundedRect(tx, cy - size / 2, size, size, 4);
      gfx.lineStyle(2.5, isRed ? COLORS.pieceBgBottom : COLORS.pieceBgTop, 1);
      gfx.strokeRoundedRect(tx, cy - size / 2, size, size, 4);
      this.add.text(tx + size / 2, cy, ch, {
        fontFamily: FONT_FAMILY, fontSize: '16px', color: '#1a1814', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(3);
    });
  }

  // ── 티켓 상태 업데이트 ──────────────────────────────────────────

  private _updateUIAfterFetch(): void {
    if (this._cancelled) return;
    const remaining = this._maxTickets - this._ticketsUsed;
    const cx = GAME_WIDTH / 2;
    const btnY = 90 + 215; // cardY + 215

    this._statusText.setText(t('matchmaking.autoMatch'));

    if (remaining > 0) {
      // 매칭 가능
      const str = t('matchmaking.ticketRemaining').replace('{r}', String(remaining)).replace('{t}', String(this._maxTickets));
      this._ticketText.setText(str).setColor('#c8a45a');
      this._setupActionButton(cx, btnY, t('matchmaking.findMatch'), 0x4a2810, 0x184a28, false, () => this._startMatch());
    } else {
      // 광고 시청
      this._ticketText.setText(t('matchmaking.ticketEmpty')).setColor('#ff9999');
      this._setupActionButton(cx, btnY, t('matchmaking.watchAd'), 0x2a1208, 0x4a1818, true, () => this._watchAd());
    }
  }

  private _setupActionButton(
    cx: number, y: number,
    label: string,
    defaultColor: number,
    hoverColor: number,
    isAd: boolean,
    onClick: () => void
  ): void {
    const w = 240, h = 50;

    const draw = (hover: boolean) => {
      this._actionBtnGfx.clear();
      this._actionBtnGfx.fillStyle(0x000000, 0.3);
      this._actionBtnGfx.fillRoundedRect(cx - w / 2 + 2, y - h / 2 + 3, w, h, 8);
      this._actionBtnGfx.fillStyle(hover ? hoverColor : defaultColor, 1);
      this._actionBtnGfx.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 8);
      this._actionBtnGfx.lineStyle(hover ? 2.5 : 1.5, isAd ? 0xff4444 : COLORS.textGoldNum, hover ? 1 : 0.7);
      this._actionBtnGfx.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 8);
    };

    draw(false);
    this._actionBtnText.setText(label);

    this._actionBtnZone.removeAllListeners();
    this._actionBtnZone.on('pointerover', () => draw(true));
    this._actionBtnZone.on('pointerout',  () => draw(false));
    this._actionBtnZone.on('pointerup',   onClick);
  }

  // ── 광고 로직 ────────────────────────────────────────────────────

  private _watchAd(): void {
    this._statusText.setText(t('matchmaking.adLoading'));
    
    AdsService.showRewarded(this, async () => {
      // On Rewarded
      if (this._cancelled) return;
      this._statusText.setText(t('matchmaking.adFinished'));
      try {
        await supabase!.rpc('grant_ad_ticket', { p_player_id: this._playerId });
        await this._fetchTickets();
      } catch (err) {
        console.error('Grant ad ticket failed:', err);
        this._statusText.setText(t('matchmaking.error'));
      }
    }, () => {
      // On Skipped
      if (this._cancelled) return;
      this._statusText.setText(t('matchmaking.watchAdWarning'));
    });
  }

  // ── 매칭 진행 ────────────────────────────────────────────────────

  private async _startMatch(): Promise<void> {
    if (!supabase || this._cancelled) return;

    // 티켓 여부 재확인 (방어 로직)
    const remaining = this._maxTickets - this._ticketsUsed;
    if (remaining <= 0) {
      this._statusText.setText(t('matchmaking.ticketEmpty'));
      this._actionBtnZone.removeAllListeners();
      return;
    }

    this._actionBtnZone.removeAllListeners(); // disable button temporarily

    // 매칭 본격 시작
    this._statusText.setText(t('matchmaking.searching'));
    this._dots.setVisible(true);
    this._actionBtnGfx.clear();
    this._actionBtnText.setText('');
    this._ticketText.setText('');

    this._controller = new OnlineGameController(this._playerId);

    this._controller.onStateChange = (state) => {
      if (this._cancelled) return;
      if (state.status === 'playing' && state.online?.roomId) {
        this._launchGame();
      }
    };

    try {
      const result = await this._controller.findMatch();
      if (this._cancelled) return;

      if (result === 'matched') {
        this._launchGame();
      } else {
        this._statusText.setText(t('matchmaking.searchingSub'));
      }
    } catch (err) {
      if (!this._cancelled) {
        this._statusText.setText(t('matchmaking.error'));
        console.error('[Matchmaking] error:', err);
        this._dots.setVisible(false);
      }
    }
  }

  private _launchGame(): void {
    if (this._cancelled || !this._controller) return;
    this._cancelled = true;

    // 티켓 실제 소모 (게임 시작(매칭 성공) 시점)
    if (supabase && this._playerId) {
      supabase.rpc('consume_ticket', { p_player_id: this._playerId }).catch((err: any) => console.error('Consume ticket error:', err));
    }

    this.cameras.main.fadeOut(300, 30, 15, 7);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { mode: 'online', controller: this._controller });
    });
  }

  private async _cancel(): Promise<void> {
    this._cancelled = true;
    await this._controller?.cancelSearch?.();
    this._goMenu();
  }

  private _goMenu(): void {
    this.cameras.main.fadeOut(250, 30, 15, 7);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
  }
}
