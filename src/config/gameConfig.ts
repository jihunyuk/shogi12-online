export const BOARD_ROWS = 4;
export const BOARD_COLS = 3;
export const TURN_DURATION_SECONDS = 30;
export const AI_SIDE = 'bottom' as const;
export const CELL_SIZE = 72;
export const BOARD_PADDING = 24;

export const COLORS = {
  background: 0x1a1a2e,
  boardLine: 0xc8a87a,
  cellLight: 0x2d1b00,
  cellDark: 0x3d2800,
  cellSelected: 0x6b8e23,
  legalMoveDot: 0x4a9eff,
  pieceText: '#ffffff',
  opponentPieceText: '#ff6b6b',
  buttonBg: 0x16213e,
  buttonHover: 0x0f3460,
  buttonText: '#e0e0e0',
  timerNormal: '#e0e0e0',
  timerWarning: '#ff6b6b',
} as const;
