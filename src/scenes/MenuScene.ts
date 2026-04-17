import Phaser from 'phaser';
import { t } from '@/i18n';
import type { AiDifficulty } from '@/types';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';


const BTN_W = 280;
const BTN_H  = 54;
const BTN_R  = 6;
const BTN_GAP = 14;

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create(): void {
    this.cameras.main.fadeIn(600, 30, 15, 7);
    this._draw();
  }

  private _draw(): void {
    this.children.removeAll(true);
    const cx = GAME_WIDTH / 2;

    // ── Background ───────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.background, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const grain = this.add.graphics();
    grain.lineStyle(1, 0xffffff, 0.018);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0);
      grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // ── Hero area ─────────────────────────────────────────────────
    const heroH = 210;
    const heroBg = this.add.graphics();
    heroBg.fillStyle(0x2a1208, 1);
    heroBg.fillRect(0, 0, GAME_WIDTH, heroH);
    heroBg.lineStyle(2, COLORS.textGoldNum, 0.7);
    heroBg.moveTo(0, heroH); heroBg.lineTo(GAME_WIDTH, heroH);
    heroBg.strokePath();

    this._drawMiniBoardMotif(cx, 68);

    this.add.text(cx, 138, 'SHOGI 12', {
      fontFamily: FONT_FAMILY,
      fontSize: '42px',
      color: COLORS.textGold,
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 175, 'MINI STRATEGY BOARD GAME  ·  3 × 4', {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      color: COLORS.textSecondary,
      letterSpacing: 2,
    }).setOrigin(0.5);

    // ── Buttons ──────────────────────────────────────────────────
    // IMPORTANT: _createButton calls onClick directly (no auto-fade).
    // Buttons that navigate to a scene handle their own fadeOut inside the action.
    // The "AI 대전" button must NOT fade before showing the picker overlay.
    const startY = heroH + 56;

    const navigate = (key: string, data?: object) => {
      this.cameras.main.fadeOut(250, 30, 15, 7);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
    };

    const items: { label: string; action: () => void; team: 'red' | 'green' | 'gold' | 'neutral' }[] = [
      { label: t('menu.localMatch'),  action: () => navigate('Game', { mode: 'local' }), team: 'red'    },
      { label: t('menu.vsComputer'),  action: () => this._showDifficultyPicker(),        team: 'green'  },
      { label: t('menu.onlineMatch'), action: () => navigate('Auth'),                    team: 'gold'   },
      { label: t('menu.rules'),       action: () => navigate('Rules'),                   team: 'neutral' },
      { label: t('menu.settings'),    action: () => navigate('Settings'),                team: 'neutral' },
    ];

    items.forEach((btn, i) => {
      this._createButton(cx, startY + i * (BTN_H + BTN_GAP), BTN_W, BTN_H, btn.label, btn.action, btn.team);
    });

    // ── Footer ───────────────────────────────────────────────────
    this.add.text(cx, GAME_HEIGHT - 16, 'Shogi12 Online  v0.1', {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: COLORS.textSecondary,
    }).setOrigin(0.5, 1);
  }

  // ── Mini board motif ──────────────────────────────────────────
  private _drawMiniBoardMotif(cx: number, cy: number): void {
    const gfx = this.add.graphics();
    const tw = 30;
    const gap = 4;
    const cols = 3;
    const rows = 2;
    const totalW = cols * tw + (cols - 1) * gap;
    const totalH = rows * tw + (rows - 1) * gap;
    const ox = cx - totalW / 2;
    const oy = cy - totalH / 2;

    const chars = [['相', '王', '將'], ['將', '王', '相']];
    const teams = [['top', 'top', 'top'], ['bottom', 'bottom', 'bottom']];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = ox + c * (tw + gap);
        const ty = oy + r * (tw + gap);
        const tColor = teams[r][c] === 'top' ? COLORS.pieceBgTop : COLORS.pieceBgBottom;

        gfx.fillStyle(0x000000, 0.35);
        gfx.fillRoundedRect(tx + 2, ty + 2, tw, tw, 4);
        gfx.fillStyle(0xfaf5e6, 1);
        gfx.fillRoundedRect(tx, ty, tw, tw, 4);
        gfx.lineStyle(2.5, tColor, 1);
        gfx.strokeRoundedRect(tx, ty, tw, tw, 4);
        gfx.lineStyle(1, tColor, 0.3);
        gfx.strokeRoundedRect(tx + 3, ty + 3, tw - 6, tw - 6, 2);

        const char = this.add.text(tx + tw / 2, ty + tw / 2, chars[r][c], {
          fontFamily: FONT_FAMILY, fontSize: '13px',
          color: '#1a1814', fontStyle: 'bold',
        }).setOrigin(0.5);
        if (r === 0) char.setAngle(180);
      }
    }
  }

  // ── Difficulty picker overlay ─────────────────────────────────
  private _showDifficultyPicker(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 270;
    const panelH = 260;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    // Collect all picker objects for bulk cleanup
    const pickerObjects: Phaser.GameObjects.GameObject[] = [];

    const backdrop = this.add.graphics().setDepth(20);
    backdrop.fillStyle(0x000000, 0.72);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    pickerObjects.push(backdrop);

    const panel = this.add.graphics().setDepth(21);
    for (let i = 3; i >= 1; i--) {
      panel.fillStyle(0x000000, 0.12 * i);
      panel.fillRoundedRect(panelX + i * 2, panelY + i * 3, panelW, panelH, 10);
    }
    panel.fillStyle(COLORS.hudBg, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, COLORS.textGoldNum, 0.8);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(1, COLORS.textGoldNum, 0.2);
    panel.strokeRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 7);
    pickerObjects.push(panel);

    const title = this.add.text(cx, panelY + 30, t('menu.difficultyTitle'), {
      fontFamily: FONT_FAMILY, fontSize: '17px',
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);
    pickerObjects.push(title);

    const divGfx = this.add.graphics().setDepth(22);
    divGfx.lineStyle(1, COLORS.textGoldNum, 0.25);
    divGfx.moveTo(panelX + 20, panelY + 50);
    divGfx.lineTo(panelX + panelW - 20, panelY + 50);
    divGfx.strokePath();
    pickerObjects.push(divGfx);

    const levels: { label: string; diff: AiDifficulty; team: 'green' | 'gold' | 'red' }[] = [
      { label: t('menu.difficulty.easy'),   diff: 'easy',   team: 'green' },
      { label: t('menu.difficulty.medium'), diff: 'medium', team: 'gold'  },
      { label: t('menu.difficulty.hard'),   diff: 'hard',   team: 'red'   },
    ];

    const destroyPicker = () => {
      pickerObjects.forEach(o => o.destroy());
    };

    const startGame = (diff: AiDifficulty) => {
      destroyPicker();
      this.cameras.main.fadeOut(250, 30, 15, 7);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { mode: 'ai', difficulty: diff });
      });
    };

    levels.forEach((lv, i) => {
      const btnY = panelY + 85 + i * 58;
      const accent =
        lv.team === 'green' ? COLORS.pieceBgTop :
        lv.team === 'red'   ? COLORS.pieceBgBottom :
        COLORS.textGoldNum;

      const btnGfx = this.add.graphics().setDepth(22);
      pickerObjects.push(btnGfx);

      const draw = (hover: boolean) => {
        btnGfx.clear();
        btnGfx.fillStyle(hover ? 0x3d2010 : 0x2a1208, 1);
        btnGfx.fillRoundedRect(panelX + 16, btnY - 22, panelW - 32, 44, 6);
        btnGfx.lineStyle(hover ? 2 : 1.5, accent, hover ? 1 : 0.5);
        btnGfx.strokeRoundedRect(panelX + 16, btnY - 22, panelW - 32, 44, 6);
        btnGfx.fillStyle(accent, 1);
        btnGfx.fillRoundedRect(panelX + 16, btnY - 22, 4, 44, { tl: 6, bl: 6, tr: 0, br: 0 });
      };
      draw(false);

      const lblMain = this.add.text(cx, btnY, lv.label, {
        fontFamily: FONT_FAMILY, fontSize: '18px',
        color: COLORS.textWhite, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(23);
      pickerObjects.push(lblMain);

      const zone = this.add.zone(cx, btnY, panelW - 32, 44)
        .setInteractive({ useHandCursor: true })
        .setDepth(23);
      pickerObjects.push(zone);
      zone.on('pointerover', () => draw(true));
      zone.on('pointerout',  () => draw(false));
      zone.on('pointerup',   () => startGame(lv.diff));
    });

    // Close button
    const closeBtn = this.add.text(panelX + panelW - 18, panelY + 18, '✕', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textSecondary,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(23);
    pickerObjects.push(closeBtn);
    closeBtn.on('pointerup', destroyPicker);

    // Backdrop click also closes
    backdrop.setInteractive();
    backdrop.on('pointerup', destroyPicker);
  }

  // ── Button factory ────────────────────────────────────────────
  // onClick is called directly — no automatic fadeOut wrapper.
  // Navigation actions must include their own fadeOut logic.
  private _createButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
    team: 'red' | 'green' | 'gold' | 'neutral' = 'neutral',
    isSmall = false,
  ): void {
    const accentColor =
      team === 'red'     ? COLORS.pieceBgBottom :
      team === 'green'   ? COLORS.pieceBgTop    :
      team === 'gold'    ? COLORS.textGoldNum   :
      /* neutral */        0x5a5040;

    const bgGfx = this.add.graphics();

    const draw = (hover: boolean) => {
      bgGfx.clear();

      if (hover) {
        bgGfx.fillStyle(0x5a3018, 1);
        bgGfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, BTN_R);
        bgGfx.lineStyle(2, accentColor, 1);
        bgGfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, BTN_R);
        bgGfx.fillStyle(accentColor, 1);
        bgGfx.fillRoundedRect(x - w / 2, y - h / 2, 5, h, { tl: BTN_R, bl: BTN_R, tr: 0, br: 0 });
        bgGfx.lineStyle(1, 0xffffff, 0.08);
        bgGfx.moveTo(x - w / 2 + 6, y - h / 2 + 1);
        bgGfx.lineTo(x + w / 2 - 2, y - h / 2 + 1);
        bgGfx.strokePath();
      } else {
        bgGfx.fillStyle(0x2a1208, 1);
        bgGfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, BTN_R);
        bgGfx.lineStyle(1.5, accentColor, 0.5);
        bgGfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, BTN_R);
        bgGfx.fillStyle(accentColor, 0.9);
        bgGfx.fillRoundedRect(x - w / 2, y - h / 2, 4, h, { tl: BTN_R, bl: BTN_R, tr: 0, br: 0 });
      }
    };

    draw(false);

    this.add.text(x, y, label, {
      fontFamily: FONT_FAMILY,
      fontSize: isSmall ? '12px' : FONT_SIZES.button,
      color: COLORS.textWhite,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerup', onClick);   // ← direct call, no fade wrapper
  }
}
