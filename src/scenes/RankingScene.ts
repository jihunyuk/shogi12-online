import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { t, countryFlag } from '@/i18n';
import { supabase } from '@/online/supabaseClient';

const HEADER_H   = 58;
const ROW_H      = 52;
const ROW_PAD_X  = 16;
const LIST_START = HEADER_H + 10;

// Medal colours for top 3
const MEDAL = [
  { fill: 0xc8a020, text: '#c8a020', label: '1' },  // gold
  { fill: 0x8a9aa8, text: '#9fb0be', label: '2' },  // silver
  { fill: 0x8b5c2a, text: '#b07840', label: '3' },  // bronze
] as const;

interface PlayerRow {
  rank:    number;
  id:      string;
  nick:    string;
  country: string;
  rating:  number;
}

export class RankingScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private scrollY   = 0;
  private maxScroll = 0;
  private myId      = '';

  constructor() { super({ key: 'Ranking' }); }

  create(): void {
    this.cameras.main.fadeIn(400, 30, 15, 7);
    this.scrollY = 0;
    void this._asyncInit();
  }

  private async _asyncInit(): Promise<void> {
    const cx = GAME_WIDTH / 2;

    // ── Background ───────────────────────────────────────────────
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
    const hdr = this.add.graphics().setDepth(5);
    hdr.fillStyle(COLORS.hudBg, 1);
    hdr.fillRect(0, 0, GAME_WIDTH, HEADER_H);
    hdr.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    hdr.moveTo(0, HEADER_H); hdr.lineTo(GAME_WIDTH, HEADER_H); hdr.strokePath();

    this.add.text(16, 29, '←', { fontSize: '26px', color: COLORS.textGold })
      .setOrigin(0, 0.5).setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.cameras.main.fadeOut(250, 30, 15, 7);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Matchmaking'));
      });

    this.add.text(cx, 29, 'RANKING', {
      fontFamily: FONT_FAMILY, fontSize: '17px',
      color: COLORS.textGold, fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(10);

    // ── Column header ─────────────────────────────────────────────
    const colHdrY = HEADER_H + 10;
    const colHdr = this.add.graphics().setDepth(4);
    colHdr.fillStyle(0x331a0d, 0.95);
    colHdr.fillRect(0, colHdrY, GAME_WIDTH, 28);
    colHdr.lineStyle(2, COLORS.textGoldNum, 0.3);
    colHdr.moveTo(0, colHdrY + 28); colHdr.lineTo(GAME_WIDTH, colHdrY + 28); colHdr.strokePath();

    const colStyle = { fontFamily: FONT_FAMILY, fontSize: '12px', color: COLORS.textGold, fontStyle: 'bold' };
    this.add.text(ROW_PAD_X + 28, colHdrY + 14, '#',            colStyle).setOrigin(0.5, 0.5).setDepth(5);
    this.add.text(ROW_PAD_X + 68, colHdrY + 14, t('ranking.country'), colStyle).setOrigin(0.5, 0.5).setDepth(5);
    this.add.text(ROW_PAD_X + 105, colHdrY + 14, 'PLAYER',     colStyle).setOrigin(0, 0.5).setDepth(5);
    this.add.text(GAME_WIDTH - ROW_PAD_X, colHdrY + 14, 'RATING', colStyle).setOrigin(1, 0.5).setDepth(5);

    // ── Loading indicator ─────────────────────────────────────────
    const loading = this.add.text(cx, GAME_HEIGHT / 2, t('ranking.loading'), {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textSecondary,
    }).setOrigin(0.5);

    // ── Fetch current user ────────────────────────────────────────
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      this.myId = user?.id ?? '';
    }

    // ── Fetch TOP 100 ────────────────────────────────────────────
    const players: PlayerRow[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, rating, country_code')
        .order('rating', { ascending: false })
        .order('total_wins', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[Ranking] fetch error:', error);
      } else if (data) {
        data.forEach((row: Record<string, unknown>, i: number) => {
          players.push({
            rank:    i + 1,
            id:      row.id      as string,
            nick:    (row.nickname     as string) || 'Guest',
            country: (row.country_code as string) || '',
            rating:  row.rating  as number,
          });
        });
      }
    }

    loading.destroy();

    if (players.length === 0) {
      this.add.text(cx, GAME_HEIGHT / 2, t('ranking.noData'), {
        fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textSecondary,
      }).setOrigin(0.5);
      return;
    }

    // ── Scrollable list ───────────────────────────────────────────
    const LIST_TOP = colHdrY + 28 + 6;
    this.container = this.add.container(0, LIST_TOP).setDepth(2);

    players.forEach((p, i) => this._drawRow(p, i));

    const totalH = players.length * ROW_H + 16;
    const FOOTER_H = 48;

    // Clipping mask so rows don't bleed over header or footer
    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, LIST_TOP, GAME_WIDTH, GAME_HEIGHT - LIST_TOP - FOOTER_H);
    this.container.setMask(new Phaser.Display.Masks.GeometryMask(this, maskShape));

    // ── Footer (My Rank) ──────────────────────────────────────────
    const footerY = GAME_HEIGHT - FOOTER_H;
    const ftr = this.add.graphics().setDepth(15);
    ftr.fillStyle(COLORS.hudBg, 1);
    ftr.fillRect(0, footerY, GAME_WIDTH, FOOTER_H);
    ftr.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    ftr.moveTo(0, footerY); ftr.lineTo(GAME_WIDTH, footerY); ftr.strokePath();

    const myRankText = this.add.text(16, footerY + FOOTER_H / 2, t('ranking.myRanking') + ': --', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textGold, fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(20);

    const percentileText = this.add.text(GAME_WIDTH - 16, footerY + FOOTER_H / 2, '--', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textSecondary
    }).setOrigin(1, 0.5).setDepth(20);

    if (supabase && this.myId) {
      supabase.rpc('get_player_rank', { p_player_id: this.myId }).then(({ data }: any) => {
        if (!this.sys.isActive()) return;
        if (!data) return;
        const { rank, total, rating } = data;
        myRankText.setText(`${t('ranking.myRanking')}: ${rating} P | ${rank}#`);
        
        const rawPct = (rank / total) * 100;
        const pct = rawPct < 1 && rawPct > 0 ? rawPct.toFixed(1) : Math.round(rawPct);
        percentileText.setText(`${t('ranking.percentile').replace('{p}', String(pct))} (${t('ranking.totalPlayers').replace('{t}', String(total))})`);
      });
    }

    // Update maxScroll to account for footer
    this.maxScroll = Math.max(0, totalH - (GAME_HEIGHT - LIST_TOP - FOOTER_H));

    // ── Scroll input ──────────────────────────────────────────────
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: unknown, dy: number) => {
      this._scroll(dy * 2);
    });
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { lastY = p.y; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this._scroll(-(p.y - lastY));
      lastY = p.y;
    });
  }

  // ── Row renderer ─────────────────────────────────────────────

  private _drawRow(p: PlayerRow, idx: number): void {
    const y       = idx * ROW_H;
    const isMe    = p.id === this.myId;
    const isMedal = p.rank <= 3;
    const medal   = isMedal ? MEDAL[p.rank - 1] : null;

    // Row background
    const rowBg = this.add.graphics();
    if (isMe) {
      // Highlight my own row
      rowBg.fillStyle(0x3d2418, 1);
      rowBg.fillRect(0, y, GAME_WIDTH, ROW_H - 1);
      rowBg.lineStyle(1.5, COLORS.textGoldNum, 0.6);
      rowBg.moveTo(0, y); rowBg.lineTo(GAME_WIDTH, y); rowBg.strokePath();
      rowBg.moveTo(0, y + ROW_H - 1); rowBg.lineTo(GAME_WIDTH, y + ROW_H - 1); rowBg.strokePath();
    } else if (isMedal) {
      rowBg.fillStyle(0x2a1810, 1);
      rowBg.fillRect(0, y, GAME_WIDTH, ROW_H - 1);
      rowBg.lineStyle(1, medal!.fill, 0.3);
      rowBg.moveTo(0, y + ROW_H - 1); rowBg.lineTo(GAME_WIDTH, y + ROW_H - 1); rowBg.strokePath();
    } else {
      rowBg.fillStyle(idx % 2 === 0 ? 0x1e1108 : 0x1a0d04, 1);
      rowBg.fillRect(0, y, GAME_WIDTH, ROW_H - 1);
      rowBg.lineStyle(1, 0xffffff, 0.06);
      rowBg.moveTo(0, y + ROW_H - 1); rowBg.lineTo(GAME_WIDTH, y + ROW_H - 1); rowBg.strokePath();
    }
    this.container.add(rowBg);

    // Left accent bar for top 3
    if (isMedal) {
      const accent = this.add.graphics();
      accent.fillStyle(medal!.fill, 0.9);
      accent.fillRect(0, y, 3, ROW_H - 1);
      this.container.add(accent);
    }

    const cy = y + ROW_H / 2;

    // Rank badge
    const rankColor = isMedal ? medal!.text : (isMe ? COLORS.textGold : '#a89078');
    const rankSize  = isMedal ? '16px' : '14px';
    const rankStyle = isMedal ? 'bold' : 'normal';
    this.container.add(
      this.add.text(ROW_PAD_X + 28, cy, String(p.rank), {
        fontFamily: FONT_FAMILY, fontSize: rankSize,
        color: rankColor, fontStyle: rankStyle,
      }).setOrigin(0.5),
    );

    // Flag + Country
    if (p.country) {
      this.container.add(
        this.add.text(ROW_PAD_X + 68, cy, countryFlag(p.country), {
          fontSize: '17px'
        }).setOrigin(0.5)
      );
    }

    // Nickname
    const nickColor = isMe ? COLORS.textGold : (isMedal ? '#f5ead0' : '#d8c8a8');
    const nickStyle = isMedal || isMe ? 'bold' : 'normal';
    const nameText = this.add.text(ROW_PAD_X + 105, cy, p.nick, {
      fontFamily: FONT_FAMILY, fontSize: '15px',
      color: nickColor, fontStyle: nickStyle,
    }).setOrigin(0, 0.5);
    this.container.add(nameText);

    // "나" (ME) badge
    if (isMe) {
      const meBadge = this.add.graphics();
      meBadge.fillStyle(COLORS.textGoldNum, 1);
      const bx = ROW_PAD_X - 2, by = cy - 8, bw = 16, bh = 16;
      meBadge.fillRoundedRect(bx, by, bw, bh, 3);
      this.container.add(meBadge);

      this.container.add(
        this.add.text(bx + bw / 2, cy, t('ranking.me'), {
          fontFamily: FONT_FAMILY, fontSize: '9px',
          color: '#000000', fontStyle: 'bold',
        }).setOrigin(0.5)
      );
    }

    // Rating
    const ratingColor = isMedal ? medal!.text : (isMe ? COLORS.textGold : '#c8b898');
    this.container.add(
      this.add.text(GAME_WIDTH - ROW_PAD_X, cy, String(p.rating), {
        fontFamily: FONT_FAMILY, fontSize: '15px',
        color: ratingColor, fontStyle: isMedal || isMe ? 'bold' : 'normal',
      }).setOrigin(1, 0.5),
    );
  }

  // ── Scroll ────────────────────────────────────────────────────

  private _scroll(delta: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    const LIST_TOP = HEADER_H + 10 + 28 + 6;
    this.container.setY(LIST_TOP - this.scrollY);
  }
}
