import Phaser from 'phaser';
import { t, setLocale, getLocale } from '@/i18n';
import type { Locale } from '@/i18n';
import { COLORS } from '@/config/gameConfig';
import { GAME_WIDTH } from '@/config/phaserConfig';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Settings' });
  }

  create(): void {
    this._draw();
  }

  private _draw(): void {
    this.children.removeAll(true);
    const cx = GAME_WIDTH / 2;

    // Back
    this.add.text(16, 24, '←', { fontSize: '22px', color: '#aaa' })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Menu'));

    // Title
    this.add.text(cx, 24, t('settings.title'), {
      fontSize: '20px', color: '#e0c97f', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Language row
    this.add.text(40, 120, t('settings.language'), {
      fontSize: '16px', color: '#d0d0d0',
    });

    const locale = getLocale();
    const nextLocale: Locale = locale === 'ko' ? 'en' : 'ko';
    this._createButton(cx + 60, 128, 100, 36, locale === 'ko' ? '한국어 ▾' : 'English ▾', () => {
      setLocale(nextLocale);
      this._draw();
    });
  }

  private _createButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
  ): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(COLORS.buttonBg);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    this.add.text(x, y, label, {
      fontSize: '14px', color: COLORS.buttonText,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  }
}
