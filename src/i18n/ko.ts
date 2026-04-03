export const ko = {
  'menu.title': '쇼기12 온라인',
  'menu.localMatch': '로컬 대전',
  'menu.vsComputer': 'AI 대전',
  'menu.onlineMatch': '온라인 대전',
  'menu.rules': '게임 규칙',
  'menu.settings': '설정',

  'game.yourTurn': '당신의 차례',
  'game.opponentTurn': '상대방의 차례',
  'game.timer': '남은 시간',
  'game.reserve': '예비 기물',
  'game.check': '장군!',
  'game.win': '승리',
  'game.lose': '패배',
  'game.draw': '무승부',
  'game.timeout': '시간 초과',
  'game.entryVictory': '입왕승',
  'game.waitingForOpponent': '상대방을 기다리는 중...',
  'game.reconnecting': '재연결 중...',

  'result.win': '승리하셨습니다!',
  'result.lose': '패배하셨습니다.',
  'result.timeout': '시간이 초과되었습니다.',
  'result.entryVictory': '입왕승으로 승리하셨습니다!',
  'result.playAgain': '다시 하기',
  'result.backToMenu': '메뉴로 돌아가기',

  'rules.title': '게임 규칙',
  'rules.objective': '목표',
  'rules.objectiveText': '상대방의 王(왕)을 잡으면 승리합니다. 또는 자신의 王이 상대방 마지막 줄에 도달하면 입왕승을 노릴 수 있습니다.',

  'rules.board': '보드',
  'rules.boardText': '게임은 4행 × 3열 보드 위에서 진행됩니다. 위쪽(행 0)이 선공(top) 진영, 아래쪽(행 3)이 후공(bottom) 진영입니다.',

  'rules.pieces': '기물 종류',
  'rules.piecesText': '王(왕): 8방향 1칸 이동. 잡히면 패배.\n將(장): 상하좌우 1칸 이동. 대각선 불가.\n相(상): 대각선 1칸 이동.\n子(자): 앞으로 1칸 이동.\n後(후): 승급한 子. 상하좌우 + 전방 대각선 2방향, 총 6방향.',

  'rules.movement': '이동 규칙',
  'rules.movementText': '각 기물은 고유한 이동 방식을 가집니다. 자신의 기물이 있는 칸으로는 이동할 수 없습니다. 상대 기물이 있는 칸으로 이동하면 그 기물을 잡습니다.',

  'rules.promotion': '승급',
  'rules.promotionText': '子(자)가 상대방 마지막 줄(top은 행 3, bottom은 행 0)에 도달하면 後(후)로 승급할 수 있습니다. 승급은 선택 사항입니다. 잡힌 後는 子로 되돌아가 예비 기물이 됩니다.',

  'rules.captureAndDrop': '잡기와 드롭',
  'rules.captureAndDropText': '상대 기물을 잡으면 자신의 예비 기물로 보관됩니다. 자신의 차례에 이동 대신 예비 기물을 빈 칸에 드롭할 수 있습니다. 이동 또는 드롭 중 정확히 하나만 수행해야 합니다.',

  'rules.timer': '타이머',
  'rules.timerText': '각 턴마다 30초가 주어집니다. 30초 내에 행동하지 않으면 즉시 패배합니다.',

  'rules.winConditions': '승리 조건',
  'rules.winConditionsText': '1. 포획승: 상대방의 王을 잡으면 즉시 승리.\n2. 입왕승: 자신의 王이 상대방 마지막 줄에 도달하면 상대가 한 번 더 플레이합니다. 상대가 그 王을 잡지 못하면 입왕승으로 승리합니다.',

  'settings.title': '설정',
  'settings.language': '언어',
  'settings.sound': '소리',

  'online.createRoom': '방 만들기',
  'online.joinRoom': '방 참가',
  'online.roomCode': '방 코드',
  'online.connecting': '연결 중...',
  'online.disconnect': '연결 끊기',

  'piece.王': '왕',
  'piece.將': '장',
  'piece.相': '상',
  'piece.子': '자',
  'piece.後': '후',
} as const;
