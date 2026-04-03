import Phaser from 'phaser';
import { t } from '@/i18n';
import { createLocalController, LocalGameController } from '@/state/stateManager';
import type { Action, Coord, GameMode, GameState, Side } from '@/types';
import { BOARD_COLS, BOARD_ROWS, CELL_SIZE, BOARD_PADDING, COLORS } from '@/config/gameConfig';
import { GAME_WIDTH } from '@/config/phaserConfig';
import { getRemainingSeconds } from '@/engine/timer';

const PIECE_FONT_SIZE = '28px';
const BOARD_LEFT = (GAME_WIDTH - BOARD_COLS * CELL_SIZE) / 2;
const BOARD_TOP = 160;
const RESERVE_FONT = '18px';

export class GameScene extends Phaser.Scene {
  private controller!: LocalGameController;
  private mode!: GameMode;

  // Graphics layers
  private boardGfx!: Phaser.GameObjects.Graphics;
  private highlightGfx!: Phaser.GameObjects.Graphics;
  private pieceGroup!: Phaser.GameObjects.Group;
  private reserveGroup!: Phaser.GameObjects.Group;

  // HUD
  private turnLabel!: Phaser.GameObjects.Text;
  private timerLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: { mode: GameMode }): void {
    this.mode = data.mode ?? 'local';
  }

  create(): void {
    this.controller = createLocalController(this.mode);
    this.controller.onStateChange = state => this._render(state);

    this.boardGfx = this.add.graphics();
    this.highlightGfx = this.add.graphics();
    this.pieceGroup = this.add.group();
    this.reserveGroup = this.add.group();

    // HUD labels
    this.turnLabel = this.add.text(GAME_WIDTH / 2, 24, '', {
      fontSize: '16px',
      color: COLORS.pieceText,
    }).setOrigin(0.5);

    this.timerLabel = this.add.text(GAME_WIDTH - 16, 24, '', {
      fontSize: '20px',
      color: COLORS.timerNormal,
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Back button
    this.add.text(16, 24, '←', { fontSize: '22px', color: '#aaa' })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Menu'));

    this._setupBoardInput();

    this.controller.startGame();

    // Periodic timer tick
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.controller.tick();
        this._updateTimer(this.controller.state);
      },
    });
  }

  // ---- Rendering ----

  private _render(state: GameState): void {
    if (state.status === 'finished') {
      this.scene.start('Result', { winner: state.winner, mode: this.mode });
      return;
    }

    this._drawBoard(state);
    this._drawPieces(state);
    this._drawReserves(state);
    this._updateHUD(state);
  }

  private _drawBoard(state: GameState): void {
    this.boardGfx.clear();
    this.highlightGfx.clear();

    const selected = this.controller.getSelectedCoord();
    const legalMoves = this.controller.getLegalMovesForSelected();
    const legalTargets = new Set(
      legalMoves
        .filter(a => a.kind === 'move')
        .map(a => `${a.to.row},${a.to.col}`),
    );

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const x = BOARD_LEFT + col * CELL_SIZE;
        const y = BOARD_TOP + row * CELL_SIZE;
        const isSelected = selected?.row === row && selected?.col === col;
        const isLegal = legalTargets.has(`${row},${col}`);

        const fillColor = isSelected
          ? COLORS.cellSelected
          : (row + col) % 2 === 0
            ? COLORS.cellLight
            : COLORS.cellDark;

        this.boardGfx.fillStyle(fillColor);
        this.boardGfx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        this.boardGfx.lineStyle(1, COLORS.boardLine, 0.8);
        this.boardGfx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        if (isLegal) {
          this.highlightGfx.fillStyle(COLORS.legalMoveDot, 0.5);
          this.highlightGfx.fillCircle(
            x + CELL_SIZE / 2,
            y + CELL_SIZE / 2,
            12,
          );
        }
      }
    }
  }

  private _drawPieces(state: GameState): void {
    this.pieceGroup.clear(true, true);

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const piece = state.board[row][col];
        if (piece === null) continue;

        const x = BOARD_LEFT + col * CELL_SIZE + CELL_SIZE / 2;
        const y = BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2;
        const isOpponent = state.mode === 'online' && state.online !== undefined
          ? piece.side !== state.online.playerSide
          : piece.side === 'top';

        const color = isOpponent ? COLORS.opponentPieceText : COLORS.pieceText;

        const text = this.add.text(x, y, piece.type, {
          fontSize: PIECE_FONT_SIZE,
          color,
          fontStyle: piece.promoted ? 'bold' : 'normal',
        }).setOrigin(0.5);

        // Rotate opponent pieces 180°
        if (piece.side === 'top') text.setAngle(180);

        this.pieceGroup.add(text);
      }
    }
  }

  private _drawReserves(state: GameState): void {
    this.reserveGroup.clear(true, true);

    const drawReserve = (pieces: string[], y: number, side: Side): void => {
      const counts: Record<string, number> = {};
      for (const p of pieces) counts[p] = (counts[p] ?? 0) + 1;

      let xi = BOARD_LEFT;
      for (const [type, count] of Object.entries(counts)) {
        const label = `${type}×${count}`;
        const txt = this.add.text(xi, y, label, {
          fontSize: RESERVE_FONT,
          color: side === 'top' ? COLORS.opponentPieceText : COLORS.pieceText,
        });
        this.reserveGroup.add(txt);
        xi += 60;
      }
    };

    drawReserve(state.reserves.top, BOARD_TOP - 40, 'top');
    drawReserve(state.reserves.bottom, BOARD_TOP + BOARD_ROWS * CELL_SIZE + 12, 'bottom');
  }

  private _updateHUD(state: GameState): void {
    const isMine = state.mode === 'local' || state.currentTurn !== 'top';
    this.turnLabel.setText(isMine ? t('game.yourTurn') : t('game.opponentTurn'));
    this._updateTimer(state);
  }

  private _updateTimer(state: GameState): void {
    const secs = getRemainingSeconds(state);
    this.timerLabel.setText(`${secs}s`);
    this.timerLabel.setColor(secs <= 10 ? COLORS.timerWarning : COLORS.timerNormal);
  }

  // ---- Input ----

  private _setupBoardInput(): void {
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.x - BOARD_LEFT) / CELL_SIZE);
      const row = Math.floor((pointer.y - BOARD_TOP) / CELL_SIZE);

      if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
        this.controller.selectCoord(null);
        this._render(this.controller.state);
        return;
      }

      this._handleCellClick({ row, col });
    });
  }

  private _handleCellClick(coord: Coord): void {
    const state = this.controller.state;
    const selected = this.controller.getSelectedCoord();

    // If a piece is already selected, try to submit a move
    if (selected !== null) {
      const legalMoves = this.controller.getLegalMovesForSelected();
      const move = legalMoves.find(
        a => a.kind === 'move' && a.to.row === coord.row && a.to.col === coord.col,
      );

      if (move !== undefined) {
        this.controller.submitAction(move);
        return;
      }
    }

    // Select the tapped cell if it has a friendly piece
    const piece = state.board[coord.row][coord.col];
    if (piece !== null && piece.side === state.currentTurn) {
      this.controller.selectCoord(coord);
    } else {
      this.controller.selectCoord(null);
    }

    this._render(this.controller.state);
  }
}
