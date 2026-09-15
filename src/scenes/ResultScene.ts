import Phaser from 'phaser';
import { t, type LocaleStrings } from '@/i18n';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { AdsService } from '@/ads/adsService';
import type { GameMode, GameState, MoveRecord, Side } from '@/types';

export class ResultScene extends Phaser.Scene {
  private _winner!: Side | 'draw' | null;
  private _winReason!: GameState['winReason'];
  private _mode!: GameMode;
  private _playerId = '';
  private _ratingBefore = 0;
  private _moveHistory: MoveRecord[] = [];

  constructor() {
    super({ key: 'Result' });
  }

  init(data: {
    winner: Side | 'draw' | null;
    winReason?: GameState['winReason'];
    mode: GameMode;
    playerId?: string;
    ratingBefore?: number;
    moveHistory?: MoveRecord[];
  }): void {
    this._winner = data.winner ?? null;
    this._winReason = data.winReason ?? null;
    this._mode = data.mode ?? 'local';
    this._playerId = data.playerId ?? '';
    this._ratingBefore = data.ratingBefore ?? 0;
    this._moveHistory = data.moveHistory ?? [];
  }

  create(): void {
    this.cameras.main.fadeIn(500, 30, 15, 7);
    this._draw();

    // 경기 종료 시 전면 광고 노출
    AdsService.showInterstitial(this, () => {
      console.log('[ResultScene] Interstitial ad shown and closed.');
    });
  }

  private _draw(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // ── Background overlay ────────────────────────────────────────
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.82);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const grain = this.add.graphics();
    grain.lineStyle(1, 0xffffff, 0.012);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0);
      grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // ── Result card ───────────────────────────────────────────────
    const cardW = 290;
    const cardH = 475;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2 - 5;

    const card = this.add.graphics();
    for (let i = 4; i >= 1; i--) {
      card.fillStyle(0x000000, 0.14 * i);
      card.fillRoundedRect(cardX + i * 2, cardY + i * 3, cardW, cardH, 12);
    }
    card.fillStyle(COLORS.cardBg, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 12);
    card.lineStyle(2, COLORS.cardBorder, 1);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 12);
    card.lineStyle(1, COLORS.cardBorder, 0.25);
    card.strokeRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 8);

    const isDraw = this._winner === 'draw' || this._winReason === 'repetition';
    const isWin = this._winner === 'bottom';

    const accentColor = isDraw
      ? 0x38bdf8 // Cyan for Draw
      : isWin
      ? COLORS.winGoldNum
      : COLORS.loseRedNum;

    // Top accent bar
    card.fillStyle(accentColor, 1);
    card.fillRoundedRect(cardX, cardY, cardW, 6, { tl: 12, tr: 12, bl: 0, br: 0 });

    // ── Header: Kanji & Status ────────────────────────────────────
    const kanjiChar = isDraw ? '和' : isWin ? '勝' : '敗';
    const kanjiColor = isDraw ? '#38bdf8' : isWin ? COLORS.winGold : COLORS.loseRed;

    const glow = this.add.graphics();
    glow.fillStyle(accentColor, 0.1);
    glow.fillCircle(cx, cardY + 52, 42);

    this.add.text(cx, cardY + 52, kanjiChar, {
      fontFamily: FONT_FAMILY,
      fontSize: '52px',
      color: kanjiColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Result label
    const titleText = isDraw
      ? t('result.draw')
      : isWin
      ? t('result.win')
      : t('result.lose');

    this.add.text(cx, cardY + 95, titleText, {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      color: COLORS.textWhite,
      fontStyle: 'bold',
      stroke: '#00000066',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Win/End reason label
    const rKey = this._reasonKey(isWin);
    const reasonText = isDraw
      ? t('result.reason.repetition')
      : rKey
      ? t(rKey)
      : '';

    if (reasonText) {
      this.add.text(cx, cardY + 118, reasonText, {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        color: isWin ? COLORS.textGold : COLORS.textSecondary,
      }).setOrigin(0.5);
    }

    // Divider
    const div1Y = cardY + 134;
    const div1 = this.add.graphics();
    div1.lineStyle(1, COLORS.textGoldNum, 0.25);
    div1.moveTo(cx - 110, div1Y);
    div1.lineTo(cx + 110, div1Y);
    div1.strokePath();

    // ── Evaluation Graph (수순별 형세 그래프) ─────────────────────
    this._drawEvaluationGraph(cx, cardY + 144);

    // Divider
    const div2Y = cardY + 288;
    const div2 = this.add.graphics();
    div2.lineStyle(1, COLORS.textGoldNum, 0.25);
    div2.moveTo(cx - 110, div2Y);
    div2.lineTo(cx + 110, div2Y);
    div2.strokePath();

    // ── Buttons ───────────────────────────────────────────────────
    const playAgainY = cardY + 330;
    this._createPlayAgainButton(cx, playAgainY, isWin || isDraw);

    const menuBtnY = cardY + 392;
    this._createButton(cx, menuBtnY, 240, 42, t('result.backToMenu'), () => {
      this.cameras.main.fadeOut(250, 30, 15, 7);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
    }, 'neutral');
  }

  // ── Evaluation Graph Renderer ───────────────────────────────────────────────

  private _drawEvaluationGraph(cx: number, topY: number): void {
    const gw = 250;
    const gh = 90;
    const gx = cx - gw / 2;
    const gy = topY + 18;

    // Title
    this.add.text(gx + 4, topY, t('result.evalGraphTitle'), {
      fontFamily: FONT_FAMILY,
      fontSize: '11px',
      color: COLORS.textGold,
      fontStyle: 'bold',
      letterSpacing: 1,
    });

    const moveCount = this._moveHistory.length;
    this.add.text(gx + gw - 4, topY, `${moveCount} Moves`, {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      color: COLORS.textSecondary,
    }).setOrigin(1, 0);

    const gfx = this.add.graphics();

    // Panel background
    gfx.fillStyle(0x180b05, 0.95);
    gfx.fillRoundedRect(gx, gy, gw, gh, 6);
    gfx.lineStyle(1, 0x4a2a18, 0.7);
    gfx.strokeRoundedRect(gx, gy, gw, gh, 6);

    // Zero balance line (Center)
    const midY = gy + gh / 2;
    gfx.lineStyle(1, 0xffffff, 0.15);
    gfx.lineBetween(gx + 8, midY, gx + gw - 8, midY);

    // Labels
    this.add.text(gx + 6, gy + 4, '+Adv', {
      fontFamily: FONT_FAMILY, fontSize: '8px', color: '#10b981',
    });
    this.add.text(gx + 6, gy + gh - 12, '-Adv', {
      fontFamily: FONT_FAMILY, fontSize: '8px', color: '#ef4444',
    });

    // If no moves or very few moves, display baseline
    if (moveCount === 0) {
      gfx.lineStyle(2, 0xd4af37, 0.6);
      gfx.lineBetween(gx + 12, midY, gx + gw - 12, midY);
      return;
    }

    // Build points array
    const points: Array<{ x: number; y: number; score: number }> = [];

    // Starting equal point
    points.push({ x: gx + 10, y: midY, score: 0 });

    const innerW = gw - 24;
    const maxScore = 1500; // Normalizing scale

    this._moveHistory.forEach((rec, idx) => {
      const score = rec.evalScore ?? 0;
      const clamped = Math.max(-maxScore, Math.min(maxScore, score));
      const px = gx + 12 + ((idx + 1) / moveCount) * innerW;
      // Invert Y: positive advantage moves UP, negative moves DOWN
      const py = midY - (clamped / maxScore) * (gh / 2 - 8);
      points.push({ x: px, y: py, score });
    });

    // Draw shaded gradient / fill between line and zero center
    gfx.fillStyle(0xd4af37, 0.12);
    gfx.beginPath();
    gfx.moveTo(points[0].x, midY);
    for (const p of points) {
      gfx.lineTo(p.x, p.y);
    }
    gfx.lineTo(points[points.length - 1].x, midY);
    gfx.closePath();
    gfx.fillPath();

    // Draw main trajectory line
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const avgScore = (p1.score + p2.score) / 2;
      const col = avgScore >= 0 ? 0xd4af37 : 0xe11d48;
      gfx.lineStyle(2, col, 0.9);
      gfx.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    // Plot dot on the final decisive move
    const lastP = points[points.length - 1];
    const finalCol = lastP.score >= 0 ? 0xd4af37 : 0xe11d48;
    gfx.fillStyle(finalCol, 1);
    gfx.fillCircle(lastP.x, lastP.y, 3.5);
    gfx.lineStyle(1.5, 0xffffff, 0.9);
    gfx.strokeCircle(lastP.x, lastP.y, 3.5);
  }

  // ── Buttons ───────────────────────────────────────────────────

  private _createPlayAgainButton(cx: number, y: number, isWinOrDraw: boolean): void {
    const w = 240;
    const h = 48;
    const accent = isWinOrDraw ? COLORS.winGoldNum : 0x8855cc;

    const bgGfx = this.add.graphics();
    const draw = (hover: boolean) => {
      bgGfx.clear();
      bgGfx.fillStyle(0x000000, 0.35);
      bgGfx.fillRoundedRect(cx - w / 2 + 2, y - h / 2 + 3, w, h, 8);

      bgGfx.fillStyle(hover ? 0x4a2010 : 0x341508, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 8);

      bgGfx.lineStyle(hover ? 2.2 : 1.5, accent, 1);
      bgGfx.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 8);

      bgGfx.fillStyle(accent, 1);
      bgGfx.fillRoundedRect(cx - w / 2, y - h / 2, 4, h, { tl: 8, bl: 8, tr: 0, br: 0 });
    };
    draw(false);

    this.add.text(cx + 2, y, t('result.playAgain'), {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      color: COLORS.textWhite,
      fontStyle: 'bold',
      stroke: '#00000088',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => {
      zone.disableInteractive();
      this.cameras.main.fadeOut(200, 30, 15, 7);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { mode: this._mode });
      });
    });
  }

  private _reasonKey(isWin: boolean): keyof LocaleStrings | null {
    switch (this._winReason) {
      case 'capture':    return isWin ? 'result.reason.capture'         : 'result.reason.capturedByOpponent';
      case 'entry':      return isWin ? 'result.reason.entry'           : 'result.reason.opponentEntry';
      case 'timeout':    return isWin ? 'result.reason.opponentTimeout' : 'result.reason.timeout';
      case 'repetition': return 'result.reason.repetition';
      default:           return null;
    }
  }

  private _createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
    style: 'win' | 'lose' | 'neutral' = 'neutral',
  ): void {
    const accent =
      style === 'win' ? COLORS.textGoldNum : style === 'lose' ? COLORS.loseRedNum : 0x5a5040;

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
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZES.button,
      color: COLORS.textWhite,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', onClick);
  }
}
