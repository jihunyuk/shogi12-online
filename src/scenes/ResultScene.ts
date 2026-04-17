import Phaser from 'phaser';
import { t } from '@/i18n';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { AdsService } from '@/ads/adsService';
import type { GameMode, GameState, Side } from '@/types';


export class ResultScene extends Phaser.Scene {
  private _winner!: Side | null;
  private _winReason!: GameState['winReason'];
  private _mode!: GameMode;
  private _playerId = '';
  private _ratingBefore = 0;

  constructor() { super({ key: 'Result' }); }

  init(data: {
    winner: Side | null;
    winReason?: GameState['winReason'];
    mode: GameMode;
    playerId?: string;
    ratingBefore?: number;
  }): void {
    this._winner       = data.winner      ?? null;
    this._winReason    = data.winReason   ?? null;
    this._mode         = data.mode        ?? 'local';
    this._playerId     = data.playerId    ?? '';
    this._ratingBefore = data.ratingBefore ?? 0;
  }

  create(): void {
    this.cameras.main.fadeIn(500, 30, 15, 7);
    this._draw();

    // 경기 종료 시 전면 광고 노출 (전역 설정된 5초 광고 등)
    AdsService.showInterstitial(this, () => {
      console.log('[ResultScene] Interstitial ad shown and closed.');
    });
  }

  private _draw(): void {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    // ── Background overlay ────────────────────────────────────────
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.78);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const grain = this.add.graphics();
    grain.lineStyle(1, 0xffffff, 0.01);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0); grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // ── Result card ───────────────────────────────────────────────
    const cardW = 260;
    const cardH = 380;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    const card = this.add.graphics();
    for (let i = 4; i >= 1; i--) {
      card.fillStyle(0x000000, 0.12 * i);
      card.fillRoundedRect(cardX + i * 2, cardY + i * 3, cardW, cardH, 10);
    }
    card.fillStyle(COLORS.cardBg, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(2, COLORS.cardBorder, 1);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(1, COLORS.cardBorder, 0.25);
    card.strokeRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 7);

    const isWin = this._winner === 'bottom';
    const accentColor = isWin ? COLORS.winGoldNum : COLORS.loseRedNum;

    card.fillStyle(accentColor, 1);
    card.fillRoundedRect(cardX, cardY, cardW, 5, { tl: 10, tr: 10, bl: 0, br: 0 });

    // ── Kanji ─────────────────────────────────────────────────────
    const kanjiY = cardY + 110;
    const glow = this.add.graphics();
    glow.fillStyle(accentColor, 0.08);
    glow.fillCircle(cx, kanjiY, 70);

    this.add.text(cx, kanjiY, isWin ? '勝' : '敗', {
      fontFamily: FONT_FAMILY, fontSize: '90px',
      color: isWin ? COLORS.winGold : COLORS.loseRed,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Result label
    const resultLblY = cardY + 200;
    this.add.text(cx, resultLblY, isWin ? t('result.win') : t('result.lose'), {
      fontFamily: FONT_FAMILY, fontSize: '26px',
      color: COLORS.textWhite, fontStyle: 'bold',
      stroke: '#00000066', strokeThickness: 2,
    }).setOrigin(0.5);

    // Win reason sub-label
    const reasonKey = this._reasonKey(isWin);
    if (reasonKey) {
      this.add.text(cx, resultLblY + 30, t(reasonKey), {
        fontFamily: FONT_FAMILY, fontSize: '12px',
        color: isWin ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5);
    }

    // Divider
    const dividerY = cardY + 226;
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, COLORS.textGoldNum, 0.25);
    divGfx.moveTo(cx - 90, dividerY); divGfx.lineTo(cx + 90, dividerY);
    divGfx.strokePath();

    // ── Buttons ───────────────────────────────────────────────────
    // "Play Again" — large, prominent, instant restart (no menu skip)
    const playAgainY = dividerY + 58;
    this._createPlayAgainButton(cx, playAgainY, isWin);

    // "Back to Menu" — smaller secondary button
    const menuBtnY = dividerY + 126;
    this._createButton(cx, menuBtnY, 240, 44, t('result.backToMenu'), () => {
      this.cameras.main.fadeOut(250, 30, 15, 7);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    }, 'neutral');
  }

  // ── "Play Again" — extra-large, instant restart button ───────────────────────

  private _createPlayAgainButton(cx: number, y: number, isWin: boolean): void {
    const w = 248;
    const h = 60;
    const accent = isWin ? COLORS.winGoldNum : 0x8855cc;

    const bgGfx = this.add.graphics();
    const draw = (hover: boolean) => {
      bgGfx.clear();

      // Shadow
      bgGfx.fillStyle(0x000000, 0.35);
      bgGfx.fillRoundedRect(cx - w / 2 + 3, y - h / 2 + 4, w, h, 10);

      // Main fill
      bgGfx.fillStyle(hover ? 0x4a2010 : 0x341508, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 10);

      // Border — thicker when hovered
      bgGfx.lineStyle(hover ? 2.5 : 2, accent, 1);
      bgGfx.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 10);

      // Left accent stripe
      bgGfx.fillStyle(accent, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, 5, h, { tl: 10, bl: 10, tr: 0, br: 0 });

      // Subtle top sheen
      bgGfx.fillStyle(0xffffff, hover ? 0.06 : 0.03);
      bgGfx.fillRoundedRect(cx - w / 2 + 5, y - h / 2, w - 5, h / 2, { tl: 0, bl: 0, tr: 10, br: 0 });
    };
    draw(false);

    this.add.text(cx + 4, y, t('result.playAgain'), {
      fontFamily: FONT_FAMILY, fontSize: '20px',
      color: COLORS.textWhite, fontStyle: 'bold',
      stroke: '#00000088', strokeThickness: 2,
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerup',   () => {
      zone.disableInteractive();
      this.cameras.main.fadeOut(200, 30, 15, 7);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { mode: this._mode });
      });
    });
  }



  private _reasonKey(isWin: boolean): import('@/i18n').LocaleStrings extends Record<infer K, string> ? K | null : string | null {
    switch (this._winReason) {
      case 'capture': return isWin ? 'result.reason.capture'         : 'result.reason.capturedByOpponent';
      case 'entry':   return isWin ? 'result.reason.entry'           : 'result.reason.opponentEntry';
      case 'timeout': return isWin ? 'result.reason.opponentTimeout' : 'result.reason.timeout';
      default:        return null;
    }
  }

  // ── Generic button factory ────────────────────────────────────────────────

  private _createButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
    style: 'win' | 'lose' | 'neutral' = 'neutral',
  ): void {
    const accent =
      style === 'win'  ? COLORS.textGoldNum :
      style === 'lose' ? COLORS.loseRedNum  :
      0x5a5040;

    const bgGfx = this.add.graphics();
    const draw = (hover: boolean) => {
      bgGfx.clear();
      bgGfx.fillStyle(hover ? 0x3d2010 : 0x241408, 1);
      bgGfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      bgGfx.lineStyle(hover ? 2 : 1.5, accent, hover ? 1 : 0.6);
      bgGfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      bgGfx.fillStyle(accent, hover ? 1 : 0.8);
      bgGfx.fillRoundedRect(x - w / 2, y - h / 2, 4, h, { tl: 6, bl: 6, tr: 0, br: 0 });
    };
    draw(false);

    this.add.text(x, y, label, {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.button,
      color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerup',   onClick);
  }
}
