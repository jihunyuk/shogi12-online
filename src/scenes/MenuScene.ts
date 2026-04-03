import Phaser from 'phaser';
import { t, setLocale, getLocale } from '@/i18n';
import type { Locale } from '@/i18n';
import { COLORS } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';

const BTN_W = 240;
const BTN_H = 48;
const BTN_RADIUS = 10;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this._draw();
  }

  private _draw(): void {
    this.children.removeAll(true);

    const cx = GAME_WIDTH / 2;

    // Title
    this.add.text(cx, 80, t('menu.title'), {
      fontSize: '28px',
      color: '#e0c97f',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const buttons: { label: string; action: () => void }[] = [
      { label: t('menu.localMatch'), action: () => this.scene.start('Game', { mode: 'local' }) },
      { label: t('menu.vsComputer'), action: () => this.scene.start('Game', { mode: 'ai' }) },
      { label: t('menu.onlineMatch'), action: () => this.scene.start('Game', { mode: 'online' }) },
      { label: t('menu.rules'), action: () => this.scene.start('Rules') },
      { label: t('menu.settings'), action: () => this.scene.start('Settings') },
    ];

    buttons.forEach((btn, i) => {
      const y = 180 + i * 72;
      this._createButton(cx, y, BTN_W, BTN_H, btn.label, btn.action);
    });

    // Language toggle
    const locale = getLocale();
    const nextLocale: Locale = locale === 'ko' ? 'en' : 'ko';
    const langLabel = locale === 'ko' ? 'EN' : 'KO';

    this._createButton(cx, GAME_HEIGHT - 50, 100, 38, langLabel, () => {
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
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, BTN_RADIUS);

    const text = this.add.text(x, y, label, {
      fontSize: '18px',
      color: COLORS.buttonText,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      gfx.clear();
      gfx.fillStyle(COLORS.buttonHover);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, BTN_RADIUS);
    });

    zone.on('pointerout', () => {
      gfx.clear();
      gfx.fillStyle(COLORS.buttonBg);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, BTN_RADIUS);
    });

    zone.on('pointerup', onClick);
    text.on('pointerup', onClick);
  }
}
