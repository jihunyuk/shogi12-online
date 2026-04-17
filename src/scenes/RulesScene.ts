import Phaser from 'phaser';
import { t } from '@/i18n';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';

const PADDING = 24;
const LINE_WIDTH = GAME_WIDTH - PADDING * 2;

export class RulesScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private contentHeight = 0;

  constructor() { super({ key: 'Rules' }); }

  create(): void {
    this.cameras.main.fadeIn(400, 30, 15, 7);
    this.scrollY = 0;

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.background, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const grain = this.add.graphics();
    grain.lineStyle(1, 0xffffff, 0.012);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0); grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // ── Header ────────────────────────────────────────────────────
    const hdr = this.add.graphics();
    hdr.fillStyle(COLORS.hudBg, 1);
    hdr.fillRect(0, 0, GAME_WIDTH, 58);
    hdr.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    hdr.moveTo(0, 58); hdr.lineTo(GAME_WIDTH, 58); hdr.strokePath();
    hdr.setDepth(5);

    // Back button
    this.add.text(16, 29, '←', { fontSize: '26px', color: COLORS.textGold })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.cameras.main.fadeOut(250, 30, 15, 7);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
      })
      .setDepth(10);

    this.add.text(GAME_WIDTH / 2, 29, t('rules.title'), {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.hud,
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // ── Scrollable content ────────────────────────────────────────
    this.container = this.add.container(0, 72);
    let y = 8;

    const sections: [string, string][] = [
      [t('rules.objective'),         t('rules.objectiveText')],
      [t('rules.board'),             t('rules.boardText')],
      [t('rules.pieces'),            t('rules.piecesText')],
      [t('rules.movement'),          t('rules.movementText')],
      [t('rules.promotion'),         t('rules.promotionText')],
      [t('rules.captureAndDrop'),    t('rules.captureAndDropText')],
      [t('rules.timer'),             t('rules.timerText')],
      [t('rules.winConditions'),     t('rules.winConditionsText')],
    ];

    for (const [heading, body] of sections) {
      // Section card
      const bodyText = this.add.text(PADDING, y + 30, body, {
        fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.body,
        color: '#c8b898',
        wordWrap: { width: LINE_WIDTH, useAdvancedWrap: true }, lineSpacing: 5,
      });
      const cardH = bodyText.height + 54;

      const cardGfx = this.add.graphics();
      cardGfx.fillStyle(0x2a1208, 0.7);
      cardGfx.fillRoundedRect(PADDING - 10, y, GAME_WIDTH - PADDING * 2 + 20, cardH, 6);
      cardGfx.lineStyle(1, COLORS.textGoldNum, 0.18);
      cardGfx.strokeRoundedRect(PADDING - 10, y, GAME_WIDTH - PADDING * 2 + 20, cardH, 6);
      // Left accent
      cardGfx.fillStyle(COLORS.textGoldNum, 0.6);
      cardGfx.fillRoundedRect(PADDING - 10, y, 3, cardH, { tl: 6, bl: 6, tr: 0, br: 0 });
      this.container.add(cardGfx);

      const headText = this.add.text(PADDING, y + 12, heading, {
        fontFamily: FONT_FAMILY, fontSize: '15px',
        color: COLORS.textGold, fontStyle: 'bold',
        wordWrap: { width: LINE_WIDTH },
      });
      this.container.add(headText);
      this.container.add(bodyText);

      y += cardH + 10;
    }

    this.contentHeight = y + 20;

    // Scroll handlers
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: unknown, dy: number) => {
      this._scroll(dy * 2);
    });
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { lastY = p.y; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) { this._scroll(-(p.y - lastY)); }
      lastY = p.y;
    });
  }

  private _scroll(delta: number): void {
    const maxScroll = Math.max(0, this.contentHeight - (GAME_HEIGHT - 72));
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.container.setY(72 - this.scrollY);
  }
}
