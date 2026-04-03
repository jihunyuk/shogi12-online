import Phaser from 'phaser';
import { t } from '@/i18n';
import { COLORS } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import type { GameMode, Side } from '@/types';

export class ResultScene extends Phaser.Scene {
  private mode!: GameMode;
  private winner!: Side | null;

  constructor() {
    super({ key: 'Result' });
  }

  init(data: { winner: Side | null; mode: GameMode }): void {
    this.winner = data.winner ?? null;
    this.mode = data.mode ?? 'local';
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Result card
    const cardW = 280;
    const cardH = 220;
    const card = this.add.graphics();
    card.fillStyle(0x16213e);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);

    // Result text
    const resultKey = this._getResultKey();
    this.add.text(cx, cy - 60, t(resultKey as Parameters<typeof t>[0]), {
      fontSize: '24px',
      color: this.winner !== null ? '#e0c97f' : '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Play Again button
    this._createButton(cx, cy + 20, 200, 44, t('result.playAgain'), () => {
      this.scene.start('Game', { mode: this.mode });
    });

    // Back to Menu button
    this._createButton(cx, cy + 80, 200, 44, t('result.backToMenu'), () => {
      this.scene.start('Menu');
    });
  }

  private _getResultKey(): string {
    if (this.winner === null) return 'result.lose';
    // In local mode, top side is "you" — adapt as needed per mode
    return 'result.win';
  }

  private _createButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
  ): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(COLORS.buttonBg);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      gfx.clear();
      gfx.fillStyle(COLORS.buttonHover);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    });
    zone.on('pointerout', () => {
      gfx.clear();
      gfx.fillStyle(COLORS.buttonBg);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    });
    zone.on('pointerup', onClick);

    this.add.text(x, y, label, {
      fontSize: '16px',
      color: COLORS.buttonText,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  }
}
