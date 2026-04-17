import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  create(): void {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    // Dark mahogany background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.background, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Wood-grain lines
    const grain = this.add.graphics();
    grain.lineStyle(1, 0xffffff, 0.015);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0); grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // Logo tile
    const tileW = 88;
    const tileGfx = this.add.graphics();
    tileGfx.fillStyle(0x000000, 0.3);
    tileGfx.fillRoundedRect(cx - tileW / 2 + 3, cy - 80 + 3, tileW, tileW, 8);
    tileGfx.fillStyle(0xfaf5e6, 1);
    tileGfx.fillRoundedRect(cx - tileW / 2, cy - 80, tileW, tileW, 8);
    tileGfx.lineStyle(3, COLORS.textGoldNum, 1);
    tileGfx.strokeRoundedRect(cx - tileW / 2, cy - 80, tileW, tileW, 8);
    tileGfx.lineStyle(1, COLORS.textGoldNum, 0.3);
    tileGfx.strokeRoundedRect(cx - tileW / 2 + 5, cy - 80 + 5, tileW - 10, tileW - 10, 5);

    this.add.text(cx, cy - 80 + tileW / 2, '王', {
      fontFamily: FONT_FAMILY, fontSize: '44px',
      color: '#1a1814', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 30, '将 棋 12', {
      fontFamily: FONT_FAMILY, fontSize: '28px',
      color: COLORS.textGold, fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);

    const dots = this.add.text(cx, cy + 70, '● ● ●', {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: COLORS.textSecondary,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: dots, alpha: 0.25, duration: 700,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    window.setTimeout(() => this.scene.start('Menu'), 1500);
  }
}
