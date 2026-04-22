const BOARD_SIZE = 15;
const EMPTY = 0;
const HUMAN = 1;
const CPU = 2;
const CELL_COUNT = BOARD_SIZE - 1;

const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const statusElement = document.querySelector("#status");
const playerWinsElement = document.querySelector("#player-wins");
const cpuWinsElement = document.querySelector("#cpu-wins");
const newGameButton = document.querySelector("#new-game");

const padding = 36;
const boardPixels = canvas.width - padding * 2;
const spacing = boardPixels / CELL_COUNT;
const stoneRadius = spacing * 0.42;

let board = [];
let gameOver = false;
let thinking = false;
let playerWins = Number(localStorage.getItem("wuziqi-player-wins") || 0);
let cpuWins = Number(localStorage.getItem("wuziqi-cpu-wins") || 0);

playerWinsElement.textContent = String(playerWins);
cpuWinsElement.textContent = String(cpuWins);

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function toCanvasCoord(index) {
  return padding + index * spacing;
}

function drawBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(63, 42, 18, 0.6)";
  context.lineWidth = 1.4;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const y = toCanvasCoord(row);
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(canvas.width - padding, y);
    context.stroke();
  }

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    const x = toCanvasCoord(col);
    context.beginPath();
    context.moveTo(x, padding);
    context.lineTo(x, canvas.height - padding);
    context.stroke();
  }

  const starPoints = [
    [3, 3],
    [3, 7],
    [3, 11],
    [7, 3],
    [7, 7],
    [7, 11],
    [11, 3],
    [11, 7],
    [11, 11],
  ];

  context.fillStyle = "rgba(63, 42, 18, 0.75)";
  for (const [row, col] of starPoints) {
    context.beginPath();
    context.arc(toCanvasCoord(col), toCanvasCoord(row), 4.5, 0, Math.PI * 2);
    context.fill();
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== EMPTY) {
        drawStone(row, col, board[row][col]);
      }
    }
  }
}

function drawStone(row, col, player) {
  const x = toCanvasCoord(col);
  const y = toCanvasCoord(row);
  const gradient = context.createRadialGradient(
    x - stoneRadius * 0.3,
    y - stoneRadius * 0.35,
    stoneRadius * 0.2,
    x,
    y,
    stoneRadius
  );

  if (player === HUMAN) {
    gradient.addColorStop(0, "#5b5b5b");
    gradient.addColorStop(1, "#0e0e0e");
  } else {
    gradient.addColorStop(0, "#fffdf6");
    gradient.addColorStop(1, "#cbc2b3");
  }

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, stoneRadius, 0, Math.PI * 2);
  context.fill();
}

function resetGame() {
  board = createBoard();
  gameOver = false;
  thinking = false;
  statusElement.textContent = "Your turn. Place a black stone.";
  drawBoard();
}

function countLine(row, col, dr, dc, player) {
  let count = 0;
  let nextRow = row + dr;
  let nextCol = col + dc;

  while (
    nextRow >= 0 &&
    nextRow < BOARD_SIZE &&
    nextCol >= 0 &&
    nextCol < BOARD_SIZE &&
    board[nextRow][nextCol] === player
  ) {
    count += 1;
    nextRow += dr;
    nextCol += dc;
  }

  return count;
}

function checkWin(row, col, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([dr, dc]) => {
    const total =
      1 + countLine(row, col, dr, dc, player) + countLine(row, col, -dr, -dc, player);
    return total >= 5;
  });
}

function isBoardFull() {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
}

function updateScores() {
  playerWinsElement.textContent = String(playerWins);
  cpuWinsElement.textContent = String(cpuWins);
  localStorage.setItem("wuziqi-player-wins", String(playerWins));
  localStorage.setItem("wuziqi-cpu-wins", String(cpuWins));
}

function getThreatScore(row, col, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  let score = 0;

  for (const [dr, dc] of directions) {
    const forward = countLine(row, col, dr, dc, player);
    const backward = countLine(row, col, -dr, -dc, player);
    const total = forward + backward + 1;

    if (total >= 5) {
      score += 100000;
    } else if (total === 4) {
      score += 12000;
    } else if (total === 3) {
      score += 1800;
    } else if (total === 2) {
      score += 220;
    } else {
      score += 20;
    }
  }

  return score;
}

function hasNeighbor(row, col) {
  for (let dr = -2; dr <= 2; dr += 1) {
    for (let dc = -2; dc <= 2; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }

      const nextRow = row + dr;
      const nextCol = col + dc;
      if (
        nextRow >= 0 &&
        nextRow < BOARD_SIZE &&
        nextCol >= 0 &&
        nextCol < BOARD_SIZE &&
        board[nextRow][nextCol] !== EMPTY
      ) {
        return true;
      }
    }
  }

  return false;
}

function chooseCpuMove() {
  let bestMove = null;
  let bestScore = -Infinity;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== EMPTY) {
        continue;
      }

      if (!hasNeighbor(row, col) && !(row === 7 && col === 7)) {
        continue;
      }

      const attack = getThreatScore(row, col, CPU);
      const defend = getThreatScore(row, col, HUMAN);
      const centerBias = 14 - (Math.abs(row - 7) + Math.abs(col - 7));
      const total = attack * 1.15 + defend + centerBias;

      if (total > bestScore) {
        bestScore = total;
        bestMove = { row, col };
      }
    }
  }

  return bestMove || { row: 7, col: 7 };
}

function placeStone(row, col, player) {
  board[row][col] = player;
  drawBoard();

  if (checkWin(row, col, player)) {
    gameOver = true;
    if (player === HUMAN) {
      playerWins += 1;
      updateScores();
      statusElement.textContent = "You win. Five in a row.";
    } else {
      cpuWins += 1;
      updateScores();
      statusElement.textContent = "Computer wins this round.";
    }
    return true;
  }

  if (isBoardFull()) {
    gameOver = true;
    statusElement.textContent = "Board full. It ends in a draw.";
    return true;
  }

  return false;
}

function runCpuTurn() {
  if (gameOver) {
    return;
  }

  thinking = true;
  statusElement.textContent = "Computer is thinking...";

  window.setTimeout(() => {
    const move = chooseCpuMove();
    thinking = false;
    placeStone(move.row, move.col, CPU);

    if (!gameOver) {
      statusElement.textContent = "Your turn. Place a black stone.";
    }
  }, 260);
}

function handleBoardClick(event) {
  if (gameOver || thinking) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const x = (event.clientX - bounds.left) * scaleX;
  const y = (event.clientY - bounds.top) * scaleY;
  const col = Math.round((x - padding) / spacing);
  const row = Math.round((y - padding) / spacing);

  if (
    row < 0 ||
    row >= BOARD_SIZE ||
    col < 0 ||
    col >= BOARD_SIZE ||
    board[row][col] !== EMPTY
  ) {
    return;
  }

  const exactX = toCanvasCoord(col);
  const exactY = toCanvasCoord(row);
  const distance = Math.hypot(exactX - x, exactY - y);
  if (distance > spacing * 0.45) {
    return;
  }

  const finished = placeStone(row, col, HUMAN);
  if (!finished) {
    runCpuTurn();
  }
}

canvas.addEventListener("pointerdown", handleBoardClick);
newGameButton.addEventListener("click", resetGame);

resetGame();
