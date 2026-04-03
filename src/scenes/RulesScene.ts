import Phaser from 'phaser';
import { t } from '@/i18n';
import { COLORS } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';

const PADDING = 20;
const LINE_WIDTH = GAME_WIDTH - PADDING * 2;

export class RulesScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private contentHeight = 0;

  constructor() {
    super({ key: 'Rules' });
  }

  create(): void {
    this.scrollY = 0;

    // Back button (fixed)
    this.add.text(16, 24, '←', { fontSize: '22px', color: '#aaa' })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Menu'))
      .setDepth(10);

    // Title (fixed)
    this.add.text(GAME_WIDTH / 2, 24, t('rules.title'), {
      fontSize: '20px',
      color: '#e0c97f',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Scrollable container
    this.container = this.add.container(0, 60);
    let y = 0;

    const sections: [string, string][] = [
      [t('rules.objective'), t('rules.objectiveText')],
      [t('rules.board'), t('rules.boardText')],
      [t('rules.pieces'), t('rules.piecesText')],
      [t('rules.movement'), t('rules.movementText')],
      [t('rules.promotion'), t('rules.promotionText')],
      [t('rules.captureAndDrop'), t('rules.captureAndDropText')],
      [t('rules.timer'), t('rules.timerText')],
      [t('rules.winConditions'), t('rules.winConditionsText')],
    ];

    for (const [heading, body] of sections) {
      const headText = this.add.text(PADDING, y, heading, {
        fontSize: '16px',
        color: '#e0c97f',
        fontStyle: 'bold',
        wordWrap: { width: LINE_WIDTH },
      });
      this.container.add(headText);
      y += headText.height + 6;

      const bodyText = this.add.text(PADDING, y, body, {
        fontSize: '13px',
        color: '#d0d0d0',
        wordWrap: { width: LINE_WIDTH },
        lineSpacing: 4,
      });
      this.container.add(bodyText);
      y += bodyText.height + 20;
    }

    this.contentHeight = y;

    // Scroll input
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: unknown, dy: number) => {
      this._scroll(dy * 2);
    });

    // Touch drag scroll
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { lastY = p.y; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this._scroll(-(p.y - lastY));
      lastY = p.y;
    });
  }

  private _scroll(delta: number): void {
    const maxScroll = Math.max(0, this.contentHeight - (GAME_HEIGHT - 60));
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.container.setY(60 - this.scrollY);
  }
}
