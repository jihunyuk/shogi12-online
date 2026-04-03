export const en = {
  'menu.title': 'Shogi12 Online',
  'menu.localMatch': 'Local Match',
  'menu.vsComputer': 'VS Computer',
  'menu.onlineMatch': 'Online Match',
  'menu.rules': 'Rules',
  'menu.settings': 'Settings',

  'game.yourTurn': 'Your Turn',
  'game.opponentTurn': "Opponent's Turn",
  'game.timer': 'Time Left',
  'game.reserve': 'Reserve',
  'game.check': 'Check!',
  'game.win': 'Victory',
  'game.lose': 'Defeat',
  'game.draw': 'Draw',
  'game.timeout': 'Time Out',
  'game.entryVictory': 'Entry Victory',
  'game.waitingForOpponent': 'Waiting for opponent...',
  'game.reconnecting': 'Reconnecting...',

  'result.win': 'You Win!',
  'result.lose': 'You Lose.',
  'result.timeout': 'Time has run out.',
  'result.entryVictory': 'Victory by Entry!',
  'result.playAgain': 'Play Again',
  'result.backToMenu': 'Back to Menu',

  'rules.title': 'Game Rules',
  'rules.objective': 'Objective',
  'rules.objectiveText': 'Capture your opponent\'s 王 (King) to win. Alternatively, advance your own 王 to the opponent\'s last row to claim an Entry Victory.',

  'rules.board': 'Board',
  'rules.boardText': 'The game is played on a 4-row × 3-column board. Row 0 (top) is the top player\'s home territory. Row 3 (bottom) is the bottom player\'s home territory.',

  'rules.pieces': 'Piece Types',
  'rules.piecesText': '王 (King): moves 1 square in any of 8 directions. Capturing it wins the game.\n將 (General): moves 1 square orthogonally (no diagonal).\n相 (Bishop): moves 1 square diagonally.\n子 (Pawn): moves 1 square forward only.\n後 (Promoted Pawn): moves orthogonally + 2 forward diagonals (6 directions total).',

  'rules.movement': 'Movement Rules',
  'rules.movementText': 'Each piece has its own movement pattern. You cannot move to a square occupied by your own piece. Moving onto an opponent\'s piece captures it.',

  'rules.promotion': 'Promotion',
  'rules.promotionText': 'When 子 reaches the opponent\'s last row (row 3 for top, row 0 for bottom), it may promote to 後. Promotion is optional. If 後 is captured, it reverts to 子 in the captor\'s reserve.',

  'rules.captureAndDrop': 'Capture and Drop',
  'rules.captureAndDropText': 'Captured pieces go into your reserve. On your turn, instead of moving a piece, you may drop a reserve piece onto any empty square. Exactly one action (move or drop) must be taken per turn.',

  'rules.timer': 'Timer',
  'rules.timerText': 'Each turn has a 30-second limit. Failing to act within 30 seconds results in an immediate loss.',

  'rules.winConditions': 'Win Conditions',
  'rules.winConditionsText': '1. Capture Victory: capture the opponent\'s 王 to win immediately.\n2. Entry Victory: if your 王 reaches the opponent\'s last row, the opponent gets one more turn. If they cannot capture your 王, you win by Entry Victory.',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.sound': 'Sound',

  'online.createRoom': 'Create Room',
  'online.joinRoom': 'Join Room',
  'online.roomCode': 'Room Code',
  'online.connecting': 'Connecting...',
  'online.disconnect': 'Disconnect',

  'piece.王': 'King',
  'piece.將': 'General',
  'piece.相': 'Bishop',
  'piece.子': 'Pawn',
  'piece.後': 'Promoted Pawn',
} as const;
