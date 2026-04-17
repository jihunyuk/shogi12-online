import Phaser from 'phaser';
import { t, setLocale, getLocale, LOCALE_LABELS, LOCALE_ORDER, countryFlag } from '@/i18n';
import type { Locale } from '@/i18n';
import { COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { supabase } from '@/online/supabaseClient';

// ── Country list ──────────────────────────────────────────────────────────────
const COUNTRIES: { code: string; name: string }[] = [
  { code: '',   name: 'None' },
  { code: 'KR', name: '한국' },
  { code: 'JP', name: '日本' },
  { code: 'CN', name: '中国' },
  { code: 'TW', name: '台灣' },
  { code: 'US', name: 'USA' },
  { code: 'GB', name: 'UK' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'RU', name: 'Russia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'VN', name: 'Viet Nam' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
];

const CARD_X  = 20;
const CARD_W  = GAME_WIDTH - 40;

export class SettingsScene extends Phaser.Scene {
  private _userId   = '';
  private _nickname = '';
  private _country  = '';

  private _nickValueText!: Phaser.GameObjects.Text;
  private _countryValueText!: Phaser.GameObjects.Text;
  private _savedFeedback!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'Settings' }); }

  create(): void {
    this.cameras.main.fadeIn(400, 30, 15, 7);
    this._drawStatic();
    void this._asyncInit();
  }

  // ── Static layout (sync) ──────────────────────────────────────

  private _drawStatic(): void {
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

    // Header
    const hdr = this.add.graphics();
    hdr.fillStyle(COLORS.hudBg, 1);
    hdr.fillRect(0, 0, GAME_WIDTH, 58);
    hdr.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    hdr.moveTo(0, 58); hdr.lineTo(GAME_WIDTH, 58); hdr.strokePath();

    this.add.text(16, 29, '←', { fontSize: '26px', color: COLORS.textGold })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.cameras.main.fadeOut(250, 30, 15, 7);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
      });

    this.add.text(cx, 29, t('settings.title'), {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.hud,
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── Language card ─────────────────────────────────────────────
    const langY = 82;
    const langH = 128;
    this._drawCard(langY, langH);
    this.add.text(CARD_X + 16, langY + 20, t('settings.language'), {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary,
    }).setOrigin(0, 0.5);
    this._drawLangButtons(langY);

    // ── Version ───────────────────────────────────────────────────
    this.add.text(cx, GAME_HEIGHT - 20, 'Shogi12 Online  v0.1.0', {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.textSecondary,
    }).setOrigin(0.5, 1);
  }

  // ── Async profile load ────────────────────────────────────────

  private async _asyncInit(): Promise<void> {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    this._userId = user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, country_code')
      .eq('id', user.id)
      .single();

    this._nickname = (profile?.nickname as string) ?? '';
    this._country  = (profile?.country_code as string) ?? '';

    this._drawProfileCard();
  }

  // ── Profile card (drawn after async load) ────────────────────

  private _drawProfileCard(): void {
    const profY = 82 + 128 + 14;
    const profH = 130;

    this._drawCard(profY, profH, t('settings.profile'));

    const row1Y = profY + 46;
    const row2Y = profY + 94;

    // Nickname row
    this.add.text(CARD_X + 16, row1Y, t('settings.nickname'), {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary,
    }).setOrigin(0, 0.5);

    this._nickValueText = this.add.text(CARD_X + CARD_W - 16, row1Y, this._nickname || '—', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this._makeRowButton(row1Y, () => this._editNickname());

    // Country row
    this.add.text(CARD_X + 16, row2Y, t('settings.country'), {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary,
    }).setOrigin(0, 0.5);

    this._countryValueText = this.add.text(CARD_X + CARD_W - 16, row2Y,
      this._countryDisplay(), {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this._makeRowButton(row2Y, () => this._showCountryPicker());

    // Saved feedback text (hidden until save)
    this._savedFeedback = this.add.text(GAME_WIDTH / 2, profY + profH + 10,
      t('settings.saved'), {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: '#88cc88',
    }).setOrigin(0.5).setAlpha(0);
  }

  // ── Nickname edit ─────────────────────────────────────────────

  private _editNickname(): void {
    const current = this._nickname || '';
    const input = window.prompt(t('settings.nickname'), current);
    if (input === null) return;
    const trimmed = input.trim().slice(0, 12);
    if (!trimmed) return;
    this._nickname = trimmed;
    this._nickValueText.setText(trimmed);
    void this._saveField('nickname', trimmed);
  }

  // ── Country picker ────────────────────────────────────────────

  private _showCountryPicker(): void {
    const cx   = GAME_WIDTH / 2;
    const panW = GAME_WIDTH - 40;
    const panX = 20;
    const panY = 90;
    const panH = GAME_HEIGHT - 120;

    const objs: Phaser.GameObjects.GameObject[] = [];

    // Backdrop
    const backdrop = this.add.graphics().setDepth(20);
    backdrop.fillStyle(0x000000, 0.75);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    objs.push(backdrop);

    // Panel
    const panel = this.add.graphics().setDepth(21);
    panel.fillStyle(COLORS.hudBg, 1);
    panel.fillRoundedRect(panX, panY, panW, panH, 10);
    panel.lineStyle(2, COLORS.textGoldNum, 0.7);
    panel.strokeRoundedRect(panX, panY, panW, panH, 10);
    objs.push(panel);

    // Title
    this.add.text(cx, panY + 24, t('settings.selectCountry'), {
      fontFamily: FONT_FAMILY, fontSize: '16px',
      color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);

    const destroy = () => { objs.forEach(o => o.destroy()); };

    // Close button
    const closeBtn = this.add.text(panX + panW - 16, panY + 16, '✕', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: COLORS.textSecondary,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(23);
    closeBtn.on('pointerup', destroy);
    objs.push(closeBtn);

    // Divider
    const divGfx = this.add.graphics().setDepth(22);
    divGfx.lineStyle(1, COLORS.textGoldNum, 0.2);
    divGfx.moveTo(panX + 16, panY + 44); divGfx.lineTo(panX + panW - 16, panY + 44);
    divGfx.strokePath();
    objs.push(divGfx);

    // Scrollable list
    const listTop    = panY + 52;
    const listHeight = panH - 60;
    const itemH      = 44;
    const colW       = panW / 2;
    const contentH   = Math.ceil(COUNTRIES.length / 2) * itemH;

    const listContainer = this.add.container(0, listTop).setDepth(22);
    objs.push(listContainer);

    // Clipping mask
    const mask = this.add.graphics().setDepth(22);
    mask.fillStyle(0xffffff);
    mask.fillRect(panX, listTop, panW, listHeight);
    listContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, mask));
    objs.push(mask);

    // Build items
    COUNTRIES.forEach((c, i) => {
      const col    = i % 2;
      const row    = Math.floor(i / 2);
      const ix     = panX + col * colW;
      const iy     = row * itemH;
      const isCur  = c.code === this._country;

      const itemGfx = this.add.graphics();
      itemGfx.fillStyle(isCur ? 0x3a2010 : 0x2a1208, isCur ? 1 : 0.6);
      itemGfx.fillRoundedRect(ix + 4, iy + 2, colW - 8, itemH - 4, 5);
      if (isCur) {
        itemGfx.lineStyle(1.5, COLORS.textGoldNum, 0.8);
        itemGfx.strokeRoundedRect(ix + 4, iy + 2, colW - 8, itemH - 4, 5);
      }
      listContainer.add(itemGfx);

      const flagText = this.add.text(ix + 18, iy + itemH / 2,
        countryFlag(c.code), {
        fontFamily: FONT_FAMILY, fontSize: '18px',
      }).setOrigin(0, 0.5);
      listContainer.add(flagText);

      const nameText = this.add.text(ix + 44, iy + itemH / 2, c.name, {
        fontFamily: FONT_FAMILY, fontSize: '12px',
        color: isCur ? COLORS.textGold : COLORS.textWhite,
      }).setOrigin(0, 0.5);
      listContainer.add(nameText);

      const zone = this.add.zone(ix + colW / 2, iy + itemH / 2, colW, itemH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        this._country = c.code;
        this._countryValueText.setText(this._countryDisplay());
        void this._saveField('country_code', c.code);
        destroy();
      });
      listContainer.add(zone);
    });

    // Scroll
    let scrollY = 0;
    const maxScroll = Math.max(0, contentH - listHeight);
    const applyScroll = () => listContainer.setY(listTop - scrollY);

    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: unknown, dy: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + dy * 1.5, 0, maxScroll);
      applyScroll();
    });
    let lastY = 0;
    const onDown  = (p: Phaser.Input.Pointer) => { lastY = p.y; };
    const onMove  = (p: Phaser.Input.Pointer) => {
      if (p.isDown) { scrollY = Phaser.Math.Clamp(scrollY - (p.y - lastY), 0, maxScroll); applyScroll(); }
      lastY = p.y;
    };
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);

    backdrop.setInteractive();
    backdrop.on('pointerup', destroy);
  }

  // ── Language buttons (2×2 grid) ──────────────────────────────

  private _drawLangButtons(langY: number): void {
    const current = getLocale();
    const btnW    = (CARD_W - 36) / 2;   // 142px
    const btnH    = 32;
    const leftX   = CARD_X + 12 + btnW / 2;
    const rightX  = CARD_X + 12 + btnW + 12 + btnW / 2;
    const row1Y   = langY + 58;
    const row2Y   = langY + 98;

    const positions: [Locale, number, number][] = [
      ['ko', leftX,  row1Y],
      ['en', rightX, row1Y],
      ['zh', leftX,  row2Y],
      ['ja', rightX, row2Y],
    ];

    for (const [locale, x, y] of positions) {
      const isActive = locale === current;
      const gfx = this.add.graphics();

      const draw = (hover: boolean) => {
        gfx.clear();
        if (isActive) {
          gfx.fillStyle(0x4a2810, 1);
          gfx.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
          gfx.lineStyle(2, COLORS.textGoldNum, 1);
          gfx.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
        } else {
          gfx.fillStyle(hover ? 0x3d2010 : 0x221008, 1);
          gfx.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
          gfx.lineStyle(1, COLORS.textGoldNum, hover ? 0.6 : 0.25);
          gfx.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
        }
      };
      draw(false);

      this.add.text(x, y, LOCALE_LABELS[locale], {
        fontFamily: FONT_FAMILY, fontSize: '13px',
        color: isActive ? COLORS.textGold : COLORS.textWhite,
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      if (!isActive) {
        const zone = this.add.zone(x, y, btnW, btnH).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => draw(true));
        zone.on('pointerout',  () => draw(false));
        zone.on('pointerup', () => {
          setLocale(locale);
          this.cameras.main.fadeOut(200, 30, 15, 7);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
        });
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private _countryDisplay(): string {
    if (!this._country) return '—';
    return `${countryFlag(this._country)}  ${this._country}`;
  }

  private _drawCard(y: number, h: number, title?: string): void {
    const card = this.add.graphics();
    card.fillStyle(0x2a1208, 0.8);
    card.fillRoundedRect(CARD_X, y, CARD_W, h, 6);
    card.lineStyle(1, COLORS.textGoldNum, 0.2);
    card.strokeRoundedRect(CARD_X, y, CARD_W, h, 6);
    card.fillStyle(COLORS.textGoldNum, 0.6);
    card.fillRoundedRect(CARD_X, y, 3, h, { tl: 6, bl: 6, tr: 0, br: 0 });

    if (title) {
      this.add.text(CARD_X + 16, y + 16, title, {
        fontFamily: FONT_FAMILY, fontSize: '12px',
        color: COLORS.textSecondary,
      }).setOrigin(0, 0.5);
    }
  }

  private _makeRowButton(rowY: number, onClick: () => void): void {
    const zone = this.add.zone(GAME_WIDTH / 2, rowY, CARD_W, 36)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);
  }

  private _createSmallBtn(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
  ): void {
    const gfx = this.add.graphics();
    const draw = (hover: boolean) => {
      gfx.clear();
      gfx.fillStyle(hover ? 0x5a3018 : 0x3d2010, 1);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 5);
      gfx.lineStyle(1.5, COLORS.textGoldNum, hover ? 0.9 : 0.5);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 5);
    };
    draw(false);

    this.add.text(x, y, label, {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textWhite,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout',  () => draw(false));
    zone.on('pointerup',   onClick);
  }

  private async _saveField(field: 'nickname' | 'country_code', value: string): Promise<void> {
    if (!supabase || !this._userId) return;
    await supabase.from('profiles').update({ [field]: value }).eq('id', this._userId);
    this._showSaved();
  }

  private _showSaved(): void {
    if (!this._savedFeedback) return;
    this._savedFeedback.setAlpha(1);
    this.tweens.add({
      targets: this._savedFeedback,
      alpha: 0,
      duration: 1500,
      delay: 600,
    });
  }
}
