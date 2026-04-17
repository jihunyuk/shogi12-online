import Phaser from 'phaser';
import { t } from '@/i18n';
import { LocalGameController, OnlineGameController } from '@/state/stateManager';
import type { AiDifficulty, Coord, DropAction, GameMode, GameState, Piece, PieceType, Side } from '@/types';
import { BOARD_COLS, BOARD_ROWS, CELL_SIZE, COLORS, FONT_FAMILY, FONT_SIZES } from '@/config/gameConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/phaserConfig';
import { AdsService } from '@/ads/adsService';
import { getRemainingSeconds } from '@/engine/timer';


// ── Layout constants ──────────────────────────────────────────────────────────
const BOARD_LEFT = (GAME_WIDTH - BOARD_COLS * CELL_SIZE) / 2;  // 66
const BOARD_TOP  = 166;
const BOARD_W    = BOARD_COLS * CELL_SIZE;   // 228
const BOARD_H    = BOARD_ROWS * CELL_SIZE;   // 304

const TILE_SIZE   = 62;
const TILE_RADIUS = 5;
const TILE_HALF   = TILE_SIZE / 2;

const TOP_PANEL_Y = 62;
const TOP_PANEL_H = 78;
const BOT_PANEL_Y = BOARD_TOP + BOARD_H + 28;  // 498
const BOT_PANEL_H = 78;
const CHIP_W = 52;
const CHIP_H = 30;
const CHIP_GAP = 6;

// ── Render depth layers ───────────────────────────────────────────────────────
const DEPTH_BG       = 0;
const DEPTH_PANELS   = 1;
const DEPTH_BOARD    = 2;
const DEPTH_HIGHLIGHT = 3;
const DEPTH_PIECES   = 4;
const DEPTH_RESERVES = 5;
const DEPTH_HUD      = 10;

export class GameScene extends Phaser.Scene {
  private controller!: LocalGameController;
  private mode!: GameMode;
  private difficulty!: AiDifficulty;

  // Persistent graphics layers (created once, cleared+redrawn each frame)
  private boardGfx!: Phaser.GameObjects.Graphics;
  private highlightGfx!: Phaser.GameObjects.Graphics;

  // Groups whose members are destroyed and recreated each render
  private pieceGroup!: Phaser.GameObjects.Group;
  private reserveGroup!: Phaser.GameObjects.Group;

  // HUD text refs updated each tick
  private turnLabel!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;
  private turnDot!: Phaser.GameObjects.Arc;

  // Player panel info texts (updated when online profiles arrive)
  private topPanelName!: Phaser.GameObjects.Text;
  private topPanelSub!: Phaser.GameObjects.Text;
  private botPanelName!: Phaser.GameObjects.Text;
  private botPanelSub!: Phaser.GameObjects.Text;

  private _selectedReservePiece: PieceType | null = null;
  private _reserveChips: Array<{ side: Side; piece: PieceType; cx: number; cy: number }> = [];

  constructor() { super({ key: 'Game' }); }

  // ── Lifecycle ─────────────────────────────────────────────────
  init(data: { mode: GameMode; difficulty?: AiDifficulty; controller?: LocalGameController | OnlineGameController }): void {
    this.mode       = data.mode       ?? 'local';
    this.difficulty = data.difficulty ?? 'medium';
    // Always reset; online mode passes its pre-built controller via data
    this.controller = (data.controller ?? null) as unknown as LocalGameController;
    this._selectedReservePiece = null;
    this._reserveChips = [];
  }

  create(): void {
    this.cameras.main.fadeIn(400, 30, 15, 7);

    // 게임 종료 시 보여줄 전면 광고 미리 로드
    void AdsService.prepareInterstitial();


    // For local / ai mode create controller synchronously (no async needed)
    if (!this.controller) {
      this.controller = new LocalGameController(this.mode, this.difficulty);
    }

    this.controller.onStateChange = state => this._render(state);
    this._setupStaticUI();
    this.controller.startGame();
    // Online mode: startGame() is a no-op, so render the initial state directly.
    if (this.mode === 'online') {
      this._render(this.controller.state);
    }

    // Tick every 500 ms for timer updates
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.controller.tick();
        this._updateHUD(this.controller.state);
      },
    });
  }

  shutdown(): void {
    // Null out the callback so any pending AI setTimeout doesn't try to
    // render on this (now-inactive) scene.
    if (this.controller) {
      this.controller.onStateChange = null;
    }
  }

  // ── Static UI (drawn once) ────────────────────────────────────
  private _setupStaticUI(): void {
    // Background
    this.add.graphics()
      .setDepth(DEPTH_BG)
      .fillStyle(COLORS.background, 1)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Wood-grain texture
    const grain = this.add.graphics().setDepth(DEPTH_BG);
    grain.lineStyle(1, 0xffffff, 0.012);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH + GAME_HEIGHT; i += 18) {
      grain.moveTo(i, 0); grain.lineTo(i + GAME_HEIGHT, GAME_HEIGHT);
    }
    grain.strokePath();

    // Player panels — store text refs so _updateHUD can refresh them for online
    const topPanel = this._drawPlayerPanel(TOP_PANEL_Y, TOP_PANEL_H, COLORS.pieceBgTop,    COLORS.pieceBgTopStr,    t('game.opponent'), 'top');
    const botPanel = this._drawPlayerPanel(BOT_PANEL_Y, BOT_PANEL_H, COLORS.pieceBgBottom, COLORS.pieceBgBottomStr, t('game.me'),       'bottom');
    this.topPanelName = topPanel.nameText;
    this.topPanelSub  = topPanel.subText;
    this.botPanelName = botPanel.nameText;
    this.botPanelSub  = botPanel.subText;

    // Persistent render layers
    this.boardGfx     = this.add.graphics().setDepth(DEPTH_BOARD);
    this.highlightGfx = this.add.graphics().setDepth(DEPTH_HIGHLIGHT);
    this.pieceGroup   = this.add.group();
    this.reserveGroup = this.add.group();

    // HUD bar
    const hud = this.add.graphics().setDepth(DEPTH_HUD);
    hud.fillStyle(COLORS.hudBg, 1);
    hud.fillRect(0, 0, GAME_WIDTH, 58);
    hud.lineStyle(1.5, COLORS.textGoldNum, 0.5);
    hud.moveTo(0, 58); hud.lineTo(GAME_WIDTH, 58); hud.strokePath();

    // Back button
    this.add.text(16, 29, '←', { fontSize: '26px', color: COLORS.textGold })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH_HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.cameras.main.fadeOut(250, 30, 15, 7);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
      });

    this.turnDot = this.add.circle(54, 29, 6, COLORS.pieceBgBottom).setDepth(DEPTH_HUD);

    this.turnLabel = this.add.text(GAME_WIDTH / 2 + 12, 29, '', {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.hud,
      color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_HUD);

    this.timerLabel = this.add.text(GAME_WIDTH - 14, 29, '', {
      fontFamily: FONT_FAMILY, fontSize: FONT_SIZES.timer,
      color: COLORS.timerNormal, fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(DEPTH_HUD);

    if (this.mode === 'online' && this.controller.state.online) {
      this.add.text(GAME_WIDTH - 14, 68, `Room: ${this.controller.state.online.roomId.slice(0, 8)}`, {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: COLORS.textSecondary,
      }).setOrigin(1, 0.5).setDepth(DEPTH_HUD);
    }

    this._setupInteraction();
  }

  private _drawPlayerPanel(
    panelY: number, panelH: number,
    colorNum: number, colorStr: string,
    name: string, side: Side,
  ): { nameText: Phaser.GameObjects.Text; subText: Phaser.GameObjects.Text } {
    const gfx = this.add.graphics().setDepth(DEPTH_PANELS);

    gfx.fillStyle(0x2a1208, 0.85);
    gfx.fillRect(0, panelY, GAME_WIDTH, panelH);
    gfx.fillStyle(colorNum, 1);
    gfx.fillRect(0, panelY, 4, panelH);
    gfx.lineStyle(1, colorNum, 0.25);
    if (side === 'top') {
      gfx.moveTo(4, panelY + panelH - 1); gfx.lineTo(GAME_WIDTH, panelY + panelH - 1);
    } else {
      gfx.moveTo(4, panelY); gfx.lineTo(GAME_WIDTH, panelY);
    }
    gfx.strokePath();

    const dotY = side === 'top' ? panelY + 18 : panelY + panelH - 18;
    gfx.fillStyle(colorNum, 1);
    gfx.fillCircle(22, dotY, 7);
    gfx.fillStyle(0xffffff, 0.25);
    gfx.fillCircle(20, dotY - 2, 3);

    const nameText = this.add.text(36, dotY, name, {
      fontFamily: FONT_FAMILY, fontSize: '14px',
      color: colorStr, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH_PANELS);

    // Sub-line: rating / country (shown for online mode)
    const subText = this.add.text(36, dotY + 18, '', {
      fontFamily: FONT_FAMILY, fontSize: '11px',
      color: COLORS.textSecondary,
    }).setOrigin(0, 0.5).setDepth(DEPTH_PANELS);

    return { nameText, subText };
  }

  // ── Input ─────────────────────────────────────────────────────
  private _setupInteraction(): void {
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const chip = this._reserveChips.find(c =>
        Math.abs(pointer.x - c.cx) <= CHIP_W / 2 &&
        Math.abs(pointer.y - c.cy) <= CHIP_H / 2
      );

      if (chip) {
        const { state } = this.controller;
        if (chip.side === state.currentTurn && state.status === 'playing') {
          this._selectedReservePiece = this._selectedReservePiece === chip.piece ? null : chip.piece;
          this.controller.selectCoord(null);
          this._render(state);
        }
        return;
      }

      const col = Math.floor((pointer.x - BOARD_LEFT) / CELL_SIZE);
      const row = Math.floor((pointer.y - BOARD_TOP)  / CELL_SIZE);
      if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
        this._selectedReservePiece = null;
        this.controller.selectCoord(null);
        this._render(this.controller.state);
        return;
      }
      this._handleBoardClick({ row, col });
    });
  }

  private _handleBoardClick(coord: Coord): void {
    if (this._selectedReservePiece !== null) {
      const piece = this._selectedReservePiece;
      this._selectedReservePiece = null;
      const ok = this.controller.submitAction({ kind: 'drop', piece, to: coord } as DropAction);
      if (!ok) {
        const bp = this.controller.state.board[coord.row][coord.col];
        if (bp && bp.side === this.controller.state.currentTurn) {
          this.controller.selectCoord(coord);
        } else {
          this.controller.selectCoord(null);
        }
        this._render(this.controller.state);
      }
      return;
    }

    const state = this.controller.state;
    const selected = this.controller.getSelectedCoord();

    if (selected !== null) {
      const move = this.controller.getLegalMovesForSelected().find(
        m => m.kind === 'move' && m.to.row === coord.row && m.to.col === coord.col
      );
      if (move) { this.controller.submitAction(move); return; }
    }

    const piece = state.board[coord.row][coord.col];
    if (piece && piece.side === state.currentTurn) {
      this.controller.selectCoord(coord);
    } else {
      this.controller.selectCoord(null);
    }
    this._render(state);
  }

  // ── Render pipeline ───────────────────────────────────────────
  private _render(state: GameState): void {
    if (state.status === 'finished') {
      // Pass rating snapshot for online mode so ResultScene can display the delta
      const playerId    = state.online?.myProfile?.id;
      const ratingBefore = state.online?.myProfile?.rating;
      this.time.delayedCall(500, () =>
        this.scene.start('Result', {
          winner:    state.winner,
          winReason: state.winReason,
          mode:      this.mode,
          ...(playerId         ? { playerId }    : {}),
          ...(ratingBefore != null ? { ratingBefore } : {}),
        }),
      );
      return;
    }

    // In non-local mode, clear reserve selection when it's not the human's turn
    if (this._selectedReservePiece !== null && this.mode !== 'local' && state.currentTurn !== this._humanSide) {
      this._selectedReservePiece = null;
    }

    this._drawBoard(state);
    this._drawPieces(state);
    this._drawReserves(state);
    this._updateHUD(state);
  }

  private get _humanSide(): Side {
    if (this.mode === 'online' && this.controller.state.online) {
      return this.controller.state.online.playerSide;
    }
    return 'bottom';
  }

  private _drawBoard(state: GameState): void {
    this.boardGfx.clear();
    this.highlightGfx.clear();

    const sel      = this.controller.getSelectedCoord();
    const legalSet = new Set(
      this.controller.getLegalMovesForSelected()
        .filter(m => m.kind === 'move')
        .map(m => `${m.to.row},${m.to.col}`)
    );

    // Board frame shadow
    for (let i = 4; i >= 1; i--) {
      this.boardGfx.fillStyle(0x000000, 0.14 * i);
      this.boardGfx.fillRoundedRect(
        BOARD_LEFT - 10 + i * 2, BOARD_TOP - 10 + i * 2,
        BOARD_W + 20, BOARD_H + 20, 10,
      );
    }
    // Outer wood frame
    this.boardGfx.fillStyle(COLORS.boardWood, 1);
    this.boardGfx.fillRoundedRect(BOARD_LEFT - 10, BOARD_TOP - 10, BOARD_W + 20, BOARD_H + 20, 10);
    this.boardGfx.lineStyle(1, 0xffffff, 0.1);
    this.boardGfx.strokeRoundedRect(BOARD_LEFT - 10, BOARD_TOP - 10, BOARD_W + 20, BOARD_H + 20, 10);

    // Cells
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const x = BOARD_LEFT + c * CELL_SIZE;
        const y = BOARD_TOP  + r * CELL_SIZE;
        this.boardGfx.fillStyle(0xe8d5aa, 1);
        this.boardGfx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        if (r === 0) { this.boardGfx.fillStyle(COLORS.pieceBgTop,    0.18); this.boardGfx.fillRect(x, y, CELL_SIZE, CELL_SIZE); }
        if (r === 3) { this.boardGfx.fillStyle(COLORS.pieceBgBottom, 0.18); this.boardGfx.fillRect(x, y, CELL_SIZE, CELL_SIZE); }
      }
    }

    // Grid lines
    this.boardGfx.lineStyle(1.5, 0x907030, 0.5);
    for (let r = 0; r <= BOARD_ROWS; r++) {
      this.boardGfx.moveTo(BOARD_LEFT, BOARD_TOP + r * CELL_SIZE);
      this.boardGfx.lineTo(BOARD_LEFT + BOARD_W, BOARD_TOP + r * CELL_SIZE);
    }
    for (let c = 0; c <= BOARD_COLS; c++) {
      this.boardGfx.moveTo(BOARD_LEFT + c * CELL_SIZE, BOARD_TOP);
      this.boardGfx.lineTo(BOARD_LEFT + c * CELL_SIZE, BOARD_TOP + BOARD_H);
    }
    this.boardGfx.strokePath();

    // Piece tiles (background + border + direction arrows)
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = state.board[r][c];
        if (!piece) continue;
        const cx = BOARD_LEFT + c * CELL_SIZE + CELL_SIZE / 2;
        const cy = BOARD_TOP  + r * CELL_SIZE + CELL_SIZE / 2;
        const teamColor  = piece.side === 'bottom' ? COLORS.pieceBgBottom : COLORS.pieceBgTop;
        const isSelected = sel?.row === r && sel?.col === c;
        const tx = cx - TILE_HALF;
        const ty = cy - TILE_HALF;

        this.boardGfx.fillStyle(0x000000, 0.28);
        this.boardGfx.fillRoundedRect(tx + 2, ty + 3, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
        this.boardGfx.fillStyle(isSelected ? teamColor : 0xfaf5e6, 1);
        this.boardGfx.fillRoundedRect(tx, ty, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
        this.boardGfx.lineStyle(3, teamColor, 1);
        this.boardGfx.strokeRoundedRect(tx, ty, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
        this.boardGfx.lineStyle(1, isSelected ? 0xffffff : teamColor, isSelected ? 0.35 : 0.28);
        this.boardGfx.strokeRoundedRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8, TILE_RADIUS - 1);

        if (piece.promoted) {
          this.boardGfx.lineStyle(2, COLORS.textGoldNum, 0.9);
          this.boardGfx.strokeRoundedRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4, TILE_RADIUS);
        }

        this._drawDirectionArrows(cx, cy, piece, isSelected, this.boardGfx);
      }
    }

    // Legal-move highlights
    const drawTarget = (tcx: number, tcy: number) => {
      const tx2 = tcx - TILE_HALF, ty2 = tcy - TILE_HALF;
      this.highlightGfx.fillStyle(COLORS.legalMove, 0.18);
      this.highlightGfx.fillRoundedRect(tx2, ty2, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
      this.highlightGfx.lineStyle(2.5, COLORS.legalMove, 0.9);
      this.highlightGfx.strokeRoundedRect(tx2, ty2, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
      this.highlightGfx.fillStyle(COLORS.legalMove, 0.95);
      this.highlightGfx.fillCircle(tcx, tcy, 7);
    };

    if (this._selectedReservePiece !== null) {
      const targets = (this.controller as unknown as { getLegalDropTargets(p: PieceType): Coord[] })
        .getLegalDropTargets(this._selectedReservePiece);
      targets.forEach(({ row, col }) =>
        drawTarget(BOARD_LEFT + col * CELL_SIZE + CELL_SIZE / 2, BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2)
      );
    } else {
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          if (legalSet.has(`${r},${c}`)) {
            drawTarget(BOARD_LEFT + c * CELL_SIZE + CELL_SIZE / 2, BOARD_TOP + r * CELL_SIZE + CELL_SIZE / 2);
          }
        }
      }
    }
  }

  private _drawDirectionArrows(
    cx: number, cy: number, piece: Piece,
    isSelected: boolean, gfx: Phaser.GameObjects.Graphics,
  ): void {
    const forward = piece.side === 'top' ? 1 : -1;
    const ortho: [number, number][] = [];
    const diag:  [number, number][] = [];

    switch (piece.type) {
      case '王': ortho.push([-1,0],[1,0],[0,-1],[0,1]); diag.push([-1,-1],[-1,1],[1,-1],[1,1]); break;
      case '將': ortho.push([-1,0],[1,0],[0,-1],[0,1]); break;
      case '相': diag.push([-1,-1],[-1,1],[1,-1],[1,1]); break;
      case '子': ortho.push([forward, 0]); break;
      case '後': ortho.push([-1,0],[1,0],[0,-1],[0,1]); diag.push([forward,-1],[forward,1]); break;
      default: return;
    }

    const arrowColor = isSelected ? 0xffffff : 0x2a1208;
    const alpha = 0.85;
    const EDGE  = TILE_HALF - 8;
    const ASIZE = 4;
    const ATIP  = 6;
    const DIAG  = 19;

    gfx.fillStyle(arrowColor, alpha);

    for (const [dr, dc] of ortho) {
      const ax = cx + dc * EDGE;
      const ay = cy + dr * EDGE;
      const angle = Math.atan2(dr, dc);
      const perp  = angle + Math.PI / 2;
      gfx.fillTriangle(
        ax + Math.cos(angle) * ATIP,  ay + Math.sin(angle) * ATIP,
        ax + Math.cos(perp)  * ASIZE, ay + Math.sin(perp)  * ASIZE,
        ax - Math.cos(perp)  * ASIZE, ay - Math.sin(perp)  * ASIZE,
      );
    }

    for (const [dr, dc] of diag) {
      const ax = cx + dc * DIAG;
      const ay = cy + dr * DIAG;
      const angle = Math.atan2(dr, dc);
      const perp  = angle + Math.PI / 2;
      const sz = ASIZE - 1;
      gfx.fillTriangle(
        ax + Math.cos(angle) * ATIP, ay + Math.sin(angle) * ATIP,
        ax + Math.cos(perp)  * sz,   ay + Math.sin(perp)  * sz,
        ax - Math.cos(perp)  * sz,   ay - Math.sin(perp)  * sz,
      );
    }
  }

  private _drawPieces(state: GameState): void {
    this.pieceGroup.clear(true, true);
    const sel = this.controller.getSelectedCoord();

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = state.board[r][c];
        if (!piece) continue;
        const x = BOARD_LEFT + c * CELL_SIZE + CELL_SIZE / 2;
        const y = BOARD_TOP  + r * CELL_SIZE + CELL_SIZE / 2;
        const isSelected = sel?.row === r && sel?.col === c;

        const txt = this.add.text(x, y, piece.type, {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: isSelected ? '#ffffff' : '#1a1814',
          fontStyle: 'bold',
          stroke: piece.promoted ? '#c8a020' : 'transparent',
          strokeThickness: piece.promoted ? 1.5 : 0,
        }).setOrigin(0.5).setDepth(DEPTH_PIECES);

        if (piece.side === 'top') txt.setAngle(180);
        if (isSelected) {
          this.tweens.add({ targets: txt, scale: 1.06, duration: 620, yoyo: true, repeat: -1 });
        }
        this.pieceGroup.add(txt);
      }
    }
  }

  private _drawReserves(state: GameState): void {
    this.reserveGroup.clear(true, true);
    this._reserveChips = [];

    const topChipY = TOP_PANEL_Y + TOP_PANEL_H - 28;
    const botChipY = BOT_PANEL_Y + 28;

    const drawSide = (side: Side, baseY: number) => {
      const counts: Record<string, number> = {};
      state.reserves[side].forEach(p => (counts[p] = (counts[p] ?? 0) + 1));

      const isActive = state.currentTurn === side && state.status === 'playing';
      const colorNum = side === 'bottom' ? COLORS.pieceBgBottom : COLORS.pieceBgTop;
      const colorStr = side === 'bottom' ? COLORS.pieceBgBottomStr : COLORS.pieceBgTopStr;

      const labelX = 14;
      const isEmpty = Object.keys(counts).length === 0;
      const label   = isEmpty ? t('game.reserveEmpty') : t('game.reserveLabel');
      this.reserveGroup.add(
        this.add.text(labelX, baseY, label, {
          fontFamily: FONT_FAMILY, fontSize: '12px', color: colorStr, fontStyle: 'bold',
        }).setOrigin(0, 0.5).setDepth(DEPTH_RESERVES)
      );

      let xi = labelX + 64;  // +64: label text width (~52px) + 2-space gap (~12px)
      Object.entries(counts).forEach(([piece, count]) => {
        const chipCx = xi + CHIP_W / 2;
        this._reserveChips.push({ side, piece: piece as PieceType, cx: chipCx, cy: baseY });

        const isChipSelected = this._selectedReservePiece === piece && isActive;

        const chipGfx = this.add.graphics().setDepth(DEPTH_RESERVES);
        chipGfx.fillStyle(0x000000, 0.3);
        chipGfx.fillRoundedRect(xi + 1, baseY - CHIP_H / 2 + 2, CHIP_W, CHIP_H, 12);
        chipGfx.fillStyle(isChipSelected ? colorNum : 0xfaf5e6, 1);
        chipGfx.fillRoundedRect(xi, baseY - CHIP_H / 2, CHIP_W, CHIP_H, 12);
        chipGfx.lineStyle(isChipSelected ? 2 : 1.5, colorNum, 1);
        chipGfx.strokeRoundedRect(xi, baseY - CHIP_H / 2, CHIP_W, CHIP_H, 12);
        if (isChipSelected) {
          chipGfx.lineStyle(1, 0xffffff, 0.3);
          chipGfx.strokeRoundedRect(xi + 3, baseY - CHIP_H / 2 + 3, CHIP_W - 6, CHIP_H - 6, 9);
        }
        this.reserveGroup.add(chipGfx);

        this.reserveGroup.add(
          this.add.text(chipCx, baseY, `${piece}×${count}`, {
            fontFamily: FONT_FAMILY, fontSize: '13px',
            color: isChipSelected ? '#ffffff' : '#1a1814',
            fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(DEPTH_RESERVES)
        );

        if (isActive) {
          const hoverGfx = this.add.graphics().setDepth(DEPTH_RESERVES);
          hoverGfx.fillStyle(0xffffff, 0);
          hoverGfx.fillRoundedRect(xi, baseY - CHIP_H / 2, CHIP_W, CHIP_H, 12);
          hoverGfx.setInteractive(
            new Phaser.Geom.Rectangle(xi, baseY - CHIP_H / 2, CHIP_W, CHIP_H),
            Phaser.Geom.Rectangle.Contains
          );
          hoverGfx.input!.cursor = 'pointer';
          this.reserveGroup.add(hoverGfx);
        }

        xi += CHIP_W + CHIP_GAP;
      });
    };

    drawSide('top',    topChipY);
    drawSide('bottom', botChipY);
  }

  private _updateHUD(state: GameState): void {
    const isLocal  = state.mode === 'local';
    const isMyTurn = isLocal ? true : state.currentTurn === this._humanSide;

    this.turnLabel.setText(isMyTurn ? t('game.yourTurn') : t('game.opponentTurn'));
    this.turnDot.setFillStyle(state.currentTurn === 'bottom' ? COLORS.pieceBgBottom : COLORS.pieceBgTop);

    const secs = getRemainingSeconds(state);
    this.timerLabel.setText(`${secs}s`);
    this.timerLabel.setColor(secs <= 10 ? COLORS.timerWarning : COLORS.timerNormal);

    // ── Online: update player panel names + ratings ──────────────
    if (state.mode === 'online' && state.online) {
      const { myProfile, opponentProfile, playerSide } = state.online;

      const fmtSub = (p: typeof myProfile) =>
        p ? `${p.countryCode ? p.countryCode + '  ' : ''}Rating ${p.rating}` : '';

      if (playerSide === 'bottom') {
        // I am bottom → top panel = opponent
        this.topPanelName.setText(opponentProfile?.nickname ?? t('game.opponent'));
        this.topPanelSub.setText(fmtSub(opponentProfile));
        this.botPanelName.setText(myProfile?.nickname ?? t('game.me'));
        this.botPanelSub.setText(fmtSub(myProfile));
      } else {
        // I am top → top panel = me
        this.topPanelName.setText(myProfile?.nickname ?? t('game.me'));
        this.topPanelSub.setText(fmtSub(myProfile));
        this.botPanelName.setText(opponentProfile?.nickname ?? t('game.opponent'));
        this.botPanelSub.setText(fmtSub(opponentProfile));
      }
    }
  }
}
