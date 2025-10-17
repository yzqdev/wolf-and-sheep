<script setup lang="ts">
let game: WolfGame | null = null
// 单个棋子可能存在的值
export type CellPiece = 'wolf' | 'sheep' | null

// 整个 state 的接口
export interface GameState {
  toggleAiText: string
  showDangerText: string
  showTrapText: string
  sheepCount: number
  wolfCount: number
  turnCount: number
  cellStyle: Record<string, any> // 如果你以后想放更复杂的样式对象
  possibleMoves: PiecePosition[]
  showTrapPositions: boolean
  showDangerPositions: boolean
  board: CellPiece[][]
  boardGroup: any[] // 暂时没用到，用 any；后续再细化
}

const state: GameState = reactive({
  toggleAiText: '关闭羊AI',
  showDangerText: '显示危险区域',
  showTrapText: '显示包围点',
  sheepCount: 15,
  wolfCount: 3,
  turnCount: 0,
  cellStyle: {},
  possibleMoves: [],
  showTrapPositions: false,
  showDangerPositions: false,
  board: Array(5)
    .fill(0)
    .map(() => Array(5).fill(null)),
  boardGroup: [],
})
const {
  toggleAiText,
  showDangerText,
  showTrapText,
  sheepCount,
  wolfCount,
  turnCount,
  board,
  boardGroup,
  cellStyle,
} = toRefs(state)

interface PiecePosition {
  col: number
  row: number
}

type JumpDir = readonly [number, number]

interface IGameState {
  WOLF_TURN: string
  SHEEP_TURN: string
  WOLF_WIN: string
  SHEEP_WIN: string
}

const statusRef = useTemplateRef('statusRef')
const boardRef = useTemplateRef('boardRef')
// 游戏状态
const GameState: IGameState = {
  WOLF_TURN: 'wolf',
  SHEEP_TURN: 'sheep',
  WOLF_WIN: 'wolf_win',
  SHEEP_WIN: 'sheep_win',
}

function getCellStyle(item: any, rowIndex: number, colIndex: number) {
  const defaultStyle: string[] = []
  if (item === 'wolf') {
    defaultStyle.push('wolf')
  }
  if (item === 'sheep') {
    defaultStyle.push('sheep')
  }
  if (state.possibleMoves.some((move) => move.row === rowIndex && move.col === colIndex)) {
    defaultStyle.push('possible-moves')
  }
  // 标记关键包围位置
  if (state.showTrapPositions && game?.isTrapPosition(rowIndex, colIndex)) {
    defaultStyle.push('trap-position')
  }

  // 标记危险位置
  if (state.showDangerPositions && game?.isDangerPosition(rowIndex, colIndex)) {
    defaultStyle.push('danger-position')
  }
  return defaultStyle.join(' ')
}

function getPieceStyle(item: CellPiece) {
  if (item == 'wolf') {
    return 'wolf-piece'
  }
  if (item == 'sheep') {
    return 'sheep-piece'
  }
  return ''
}

// 游戏类
class WolfGame {
  private readonly boardSize: number
  private board: any[]
  private currentState: string
  private selectedPiece: PiecePosition | null = null
  private aiEnabled: boolean

  constructor() {
    this.boardSize = 5
    this.board = []
    this.currentState = GameState.WOLF_TURN
    this.selectedPiece = null
    state.possibleMoves = []
    this.aiEnabled = true
    state.showTrapPositions = false
    state.showDangerPositions = false

    this.initBoard()
    this.renderBoard()
    this.updateStatus()
    this.updateStats()
  }

  // 初始化棋盘
  initBoard() {
    this.board = state.board

    // 放置羊 (前三行)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        this.board[row][col] = 'sheep'
      }
    }

    // 放置狼 (最后一行中间三个)
    this.board[4][1] = 'wolf'
    this.board[4][2] = 'wolf'
    this.board[4][3] = 'wolf'
  }

  // 渲染棋盘
  renderBoard() {}

  // 处理单元格点击
  handleCellClick(row: number, col: number) {
    if (this.currentState === GameState.WOLF_WIN || this.currentState === GameState.SHEEP_WIN) {
      return
    }

    const piece = this.board[row][col]

    if (this.selectedPiece === null) {
      if (this.currentState === GameState.WOLF_TURN && piece === 'wolf') {
        this.selectedPiece = { row, col }
        this.showPossibleMoves(row, col, 'wolf')
      } else if (
        this.currentState === GameState.SHEEP_TURN &&
        piece === 'sheep' &&
        !this.aiEnabled
      ) {
        this.selectedPiece = { row, col }
        this.showPossibleMoves(row, col, 'sheep')
      }
    } else {
      const isPossibleMove = state.possibleMoves.some(
        (move) => move.row === row && move.col === col,
      )

      if (isPossibleMove) {
        this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col)
        this.selectedPiece = null
        state.possibleMoves = []

        this.checkGameState()

        this.currentState =
          this.currentState === GameState.WOLF_TURN ? GameState.SHEEP_TURN : GameState.WOLF_TURN
        console.log(this.currentState)
        console.log('我惦记了')
        console.log(state.turnCount)
        if (this.currentState === GameState.SHEEP_TURN) {
          // 羊刚刚走完，下一轮开始
          state.turnCount++
        }
        this.updateStats()
        this.updateStatus()

        if (this.currentState === GameState.SHEEP_TURN && this.aiEnabled) {
          setTimeout(() => this.moveSheepAI(), 500)
        }
      } else {
        this.selectedPiece = null
        state.possibleMoves = []
        this.handleCellClick(row, col)
      }

      this.renderBoard()
    }
  }

  // 显示可能的移动位置
  showPossibleMoves(row: number, col: number, type: string) {
    state.possibleMoves = []

    const directions: JumpDir[] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc

      if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === null) {
        state.possibleMoves.push({ row: newRow, col: newCol })
      }
    }

    if (type === 'wolf') {
      const jumpDirections: JumpDir[] = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
      ]
      for (const [dr, dc] of jumpDirections) {
        const newRow = row + dr
        const newCol = col + dc
        const midRow = row + dr / 2
        const midCol = col + dc / 2

        if (
          this.isValidPosition(newRow, newCol) &&
          this.board[newRow][newCol] === 'sheep' &&
          this.board[midRow][midCol] === null
        ) {
          state.possibleMoves.push({ row: newRow, col: newCol })
        }
      }
    }

    this.renderBoard()
  }

  // 移动棋子
  movePiece(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    const pieceType = this.board[fromRow][fromCol]
    this.board[fromRow][fromCol] = null

    if (pieceType === 'wolf' && this.board[toRow][toCol] === 'sheep') {
      this.board[toRow][toCol] = 'wolf'
    } else {
      this.board[toRow][toCol] = pieceType
    }
  }

  // 检查位置是否有效
  isValidPosition(row: number, col: number) {
    return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize
  }

  // 检查是否是关键包围位置
  isTrapPosition(row: number, col: number) {
    const directions: JumpDir[] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.board[r][c] === 'wolf') {
          for (const [dr, dc] of directions) {
            if (r + dr === row && c + dc === col) {
              return true
            }
          }
        }
      }
    }
    return false
  }

  // 检查是否是危险位置（可能被狼吃掉）
  isDangerPosition(row: number, col: number) {
    const wolves = this.getAllWolves()

    for (const wolf of wolves) {
      // 检查是否在狼的直接攻击范围内
      const attackDirections: JumpDir[] = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]
      for (const [dr, dc] of attackDirections) {
        const attackRow = wolf.row + dr
        const attackCol = wolf.col + dc

        if (attackRow === row && attackCol === col) {
          return true
        }
      }

      // 检查是否在狼的跳跃攻击范围内
      const jumpDirections: JumpDir[] = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
      ]
      for (const [dr, dc] of jumpDirections) {
        const attackRow = wolf.row + dr
        const attackCol = wolf.col + dc
        const midRow = wolf.row + dr / 2
        const midCol = wolf.col + dc / 2

        if (attackRow === row && attackCol === col && this.board[midRow][midCol] === null) {
          return true
        }
      }
    }

    return false
  }

  // 获取所有狼的位置
  getAllWolves() {
    const wolves = []
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (this.board[row][col] === 'wolf') {
          wolves.push({ row, col })
        }
      }
    }
    return wolves
  }

  // 获取所有羊的位置
  getAllSheep() {
    const sheep = []
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (this.board[row][col] === 'sheep') {
          sheep.push({ row, col })
        }
      }
    }
    return sheep
  }

  // 计算位置的安全性评分（越高越安全）
  calculateSafetyScore(row: number, col: number) {
    const wolves = this.getAllWolves()
    let safetyScore = 100 // 基础安全分

    for (const wolf of wolves) {
      const distance = Math.abs(row - wolf.row) + Math.abs(col - wolf.col)

      // 距离越近越危险
      if (distance === 1)
        safetyScore -= 10 // 直接相邻非常危险
      else if (distance === 2)
        safetyScore -= 30 // 两格距离比较危险
      else if (distance === 3) safetyScore -= 10 // 三格距离有点危险

      // 检查是否在狼的攻击路径上
      if (this.isDangerPosition(row, col)) {
        safetyScore -= 50 // 在攻击路径上非常危险
      }
    }

    return Math.max(0, safetyScore) // 确保不会负分
  }

  // 羊AI移动逻辑 - 增强安全策略
  moveSheepAI() {
    if (this.currentState !== GameState.SHEEP_TURN || !this.aiEnabled) return

    const sheepPositions = this.getAllSheep()
    if (sheepPositions.length === 0) return

    const wolves = this.getAllWolves()

    // 找出所有可能的移动和评分
    let bestMove = null
    let highestScore = -Infinity

    for (const sheep of sheepPositions) {
      const possibleMoves = []
      const directions: JumpDir[] = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]

      for (const [dr, dc] of directions) {
        const newRow = sheep.row + dr
        const newCol = sheep.col + dc

        if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === null) {
          possibleMoves.push({ row: newRow, col: newCol })
        }
      }

      if (possibleMoves.length === 0) continue

      for (const move of possibleMoves) {
        let score = 0

        // 1. 安全性评估（最重要）- 占50%权重
        const safetyScore = this.calculateSafetyScore(move.row, move.col)
        score += safetyScore * 0.5

        // 2. 如果是关键包围位置，加分
        if (this.isTrapPosition(move.row, move.col)) {
          score += 25
        }

        // 3. 评估对狼的包围效果
        let minWolfDistance = Infinity
        for (const wolf of wolves) {
          const distance = Math.abs(move.row - wolf.row) + Math.abs(move.col - wolf.col)
          minWolfDistance = Math.min(minWolfDistance, distance)

          // 保持适当距离（2-3格最佳）
          if (distance === 2) score += 15
          else if (distance === 3) score += 10
          else if (distance === 1)
            score -= 30 // 太近危险
          else if (distance >= 4) score -= 5 // 太远无效
        }

        // 4. 尽量保持羊群聚集
        let avgSheepDistance = 0
        for (const otherSheep of sheepPositions) {
          if (otherSheep.row !== sheep.row || otherSheep.col !== sheep.col) {
            const distance =
              Math.abs(move.row - otherSheep.row) + Math.abs(move.col - otherSheep.col)
            avgSheepDistance += distance
          }
        }
        avgSheepDistance /= Math.max(1, sheepPositions.length - 1)

        // 理想距离是2-3格
        if (avgSheepDistance >= 2 && avgSheepDistance <= 3) score += 10
        else if (avgSheepDistance > 3) score -= avgSheepDistance * 0.5

        // 5. 尽量向上移动（远离狼的起始位置）
        if (move.row < sheep.row) score += 5

        // 记录最佳移动
        if (score > highestScore) {
          highestScore = score
          bestMove = {
            from: sheep,
            to: move,
          }
        }
      }
    }

    // 执行最佳移动
    if (bestMove) {
      this.movePiece(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col)
    }

    this.checkGameState()
    this.currentState = GameState.WOLF_TURN
    this.updateStatus()
    this.renderBoard()
  }

  // 检查游戏状态
  checkGameState() {
    // 检查狼是否获胜
    const sheepCount = this.getAllSheep().length
    if (sheepCount === 0) {
      this.currentState = GameState.WOLF_WIN
      this.updateStatus()
      return
    }

    // 检查羊是否获胜
    let allWolvesTrapped = true
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (this.board[row][col] === 'wolf') {
          if (this.hasAnyMove(row, col, 'wolf')) {
            allWolvesTrapped = false
            break
          }
        }
      }
      if (!allWolvesTrapped) break
    }

    if (allWolvesTrapped) {
      this.currentState = GameState.SHEEP_WIN
      this.updateStatus()
    }

    this.updateStats()
  }

  // 检查棋子是否有任何合法移动
  hasAnyMove(row: number, col: number, type: string) {
    const directions: JumpDir[] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc

      if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === null) {
        return true
      }
    }

    if (type === 'wolf') {
      const jumpDirections: JumpDir[] = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
      ]
      for (const [dr, dc] of jumpDirections) {
        const newRow = row + dr
        const newCol = col + dc
        const midRow = row + dr / 2
        const midCol = col + dc / 2

        if (
          this.isValidPosition(newRow, newCol) &&
          this.board[newRow][newCol] === 'sheep' &&
          this.board[midRow][0] === null
        ) {
          return true
        }
      }
    }

    return false
  }

  // 更新状态显示
  updateStatus() {
    const statusElement = statusRef.value as HTMLDivElement

    switch (this.currentState) {
      case GameState.WOLF_TURN:
        statusElement.textContent = '狼的回合 - 请选择一只狼移动'
        statusElement.style.backgroundColor = '#ffcccc'
        break
      case GameState.SHEEP_TURN:
        statusElement.textContent = this.aiEnabled
          ? '羊的回合 - AI思考中...'
          : '羊的回合 - 请选择一只羊移动'
        statusElement.style.backgroundColor = '#ccffcc'
        break
      case GameState.WOLF_WIN:
        statusElement.textContent = '游戏结束 - 狼获胜！'
        statusElement.style.backgroundColor = '#ff9999'
        break
      case GameState.SHEEP_WIN:
        statusElement.textContent = '游戏结束 - 羊获胜！'
        statusElement.style.backgroundColor = '#99ff99'
        break
    }
  }

  // 更新统计数据
  updateStats() {
    state.sheepCount = this.getAllSheep().length
    state.wolfCount = this.getAllWolves().length
  }

  // 切换AI状态
  toggleAI() {
    this.aiEnabled = !this.aiEnabled
    state.toggleAiText = this.aiEnabled ? '关闭羊AI' : '开启羊AI'
    this.updateStatus()
  }

  // 切换显示包围点
  toggleTrapPositions() {
    state.showTrapPositions = !state.showTrapPositions
    state.showTrapText = state.showTrapPositions ? '隐藏包围点' : '显示包围点'
    this.renderBoard()
  }

  // 切换显示危险区域
  toggleDangerPositions() {
    state.showDangerPositions = !state.showDangerPositions
    state.showDangerText = state.showDangerPositions ? '隐藏危险区域' : '显示危险区域'
    this.renderBoard()
  }

  // 重新开始游戏
  restart() {
    this.initBoard()
    this.currentState = GameState.WOLF_TURN
    this.selectedPiece = null

    state.turnCount = 0
    this.renderBoard()
    this.updateStatus()
    this.updateStats()
  }
}

onMounted(() => {
  game = new WolfGame()
})

function restartGame() {
  game?.restart()
}

function toggleAi() {
  game?.toggleAI()
}

function showTraps() {
  game?.toggleTrapPositions()
}

function showDanger() {
  game?.toggleDangerPositions()
}
</script>

<template>
  <div class="my-wolf-game">
    <div>
      <h1>杀白狼游戏（增强版羊AI）</h1>
      <div class="game-container">
        <div class="status" id="status" ref="statusRef">狼的回合 - 请选择一只狼移动</div>

        <div class="stats">
          <div class="stat-item">
            <div>剩余羊数</div>
            <div class="stat-value" id="sheep-count">{{ sheepCount }}</div>
          </div>
          <div class="stat-item">
            <div>剩余狼数</div>
            <div class="stat-value" id="wolf-count">{{ wolfCount }}</div>
          </div>
          <div class="stat-item">
            <div>回合数</div>
            <div class="stat-value" id="turn-count">{{ turnCount }}</div>
          </div>
        </div>

        <div class="board" id="board" v-if="false" ref="boardRef"></div>
        <div class="board">
          <template v-for="(row, rowIndex) in board">
            <div
              v-for="(item, colIndex) in row"
              class="cell"
              :class="getCellStyle(item, rowIndex, colIndex)"
              @click="game?.handleCellClick(rowIndex, colIndex)"
            >
              <div class="piece" v-if="item != null" :class="getPieceStyle(item)">
                {{ item === 'wolf' ? '狼' : '羊' }}
              </div>
            </div>
          </template>
        </div>

        <div class="controls">
          <button @click="restartGame">重新开始</button>
          <button @click="toggleAi" class="ai-btn">{{ toggleAiText }}</button>
          <button @click="showTraps">{{ showTrapText }}</button>
          <button @click="showDanger" class="danger-btn">{{ showDangerText }}</button>
        </div>
      </div>
    </div>
    <div class="info-container">
      <div class="info-panel">
        <div class="rules">
          <h3>游戏规则:</h3>
          <ul>
            <li>棋盘为5×5，前三行是羊(绿色)，后一行是狼(红色)</li>
            <li>狼和羊每回合可以上下左右移动一格，不能斜着走</li>
            <li>狼可以隔两行吃掉羊(中间必须没有障碍物)</li>
            <li>狼吃掉所有羊则狼获胜</li>
            <li>羊把狼围住使其无法移动则羊获胜</li>
            <li>羊AI现在会智能地避免被吃并包围狼</li>
          </ul>
        </div>

        <div class="ai-info">
          <h3>AI策略说明:</h3>
          <p>羊AI使用增强策略：</p>
          <ol>
            <li>优先识别和避开危险位置</li>
            <li>保持安全距离的同时包围狼</li>
            <li>协同移动，形成防御阵型</li>
            <li>在安全的前提下逐步推进包围圈</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import './wolf.scss';
</style>
