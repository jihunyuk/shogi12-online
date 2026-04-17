export const BOARD_ROWS = 4;
export const BOARD_COLS = 3;
export const TURN_DURATION_SECONDS = 30;
export const AI_SIDE = 'top' as const;
export const CELL_SIZE = 76;
export const BOARD_PADDING = 24;

export const FONT_FAMILY = "'Noto Sans KR', 'Noto Serif', serif";

export const FONT_SIZES = {
  title:    '38px',
  subtitle: '13px',
  button:   '16px',
  piece:    '28px',
  hud:      '17px',
  timer:    '21px',
  body:     '13px',
} as const;

// ── Premium dark-wood board game palette ──────────────────────────────────────
export const COLORS = {
  // App background — deep mahogany table surface
  background:     0x1e0f07,

  // Board
  boardWood:      0xc09040,   // rich kaya wood frame
  cellLight:      0xebd69e,   // natural kaya cell
  cellDark:       0xe0ca8a,   // slightly darker cell
  gridLine:       0xa87840,
  boardLine:      0xa87840,

  // Selection & legal-move highlights
  selected:       0xffd700,
  cellSelected:   0xffd700,
  legalMove:      0x5599ff,
  legalMoveDot:   0x5599ff,

  // Piece colours (tile text)
  pieceBottom:    '#f5ead0',
  pieceTop:       '#f5ead0',
  pieceText:      '#1a1814',
  opponentPieceText: '#1a1814',

  // Team colours — deep, traditional
  pieceBgBottom:    0xb52020,   // deep crimson  (player / bottom)
  pieceBgTop:       0x1a6b3c,   // deep forest green (opponent / top)
  pieceBgBottomStr: '#b52020',
  pieceBgTopStr:    '#1a6b3c',

  // Piece tile surface
  tileBg:         0xfaf5e6,   // warm cream
  tileBorder:     0x241408,
  indicatorColor: 0x241408,

  // HUD & chrome
  hudBg:          0x130905,   // near-black mahogany
  buttonBg:       0x3d2010,
  buttonHover:    0x5a3018,
  buttonBorder:   0xc8a020,   // gold
  buttonText:     '#f5ead0',

  // Text
  textGold:       '#c8a020',
  textGoldNum:    0xc8a020,
  textWhite:      '#f5ead0',   // warm cream (never pure white)
  textWhiteNum:   0xf5ead0,
  textSecondary:  '#7d6040',

  // Timer
  timerNormal:    '#f5ead0',
  timerWarning:   '#ff5555',

  // Result card
  cardBg:         0x130905,
  cardBorder:     0xc8a020,
  winGold:        '#d4a017',
  winGoldNum:     0xd4a017,
  loseRed:        '#b52020',
  loseRedNum:     0xb52020,
} as const;
