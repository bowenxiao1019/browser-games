const GRID_SIZE = 4;
const START_TILES = 2;

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const statusElement = document.querySelector("#status");
const newGameButton = document.querySelector("#new-game");

let board = [];
let score = 0;
let bestScore = Number(localStorage.getItem("best-2048-score") || 0);
let hasWon = false;
let touchStart = null;

bestScoreElement.textContent = String(bestScore);

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function getEmptyCells() {
  const emptyCells = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0) {
        emptyCells.push({ row, col });
      }
    }
  }

  return emptyCells;
}

function addRandomTile() {
  const emptyCells = getEmptyCells();
  if (emptyCells.length === 0) {
    return;
  }

  const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[row][col] = Math.random() < 0.9 ? 2 : 4;
}

function updateScore(nextScore) {
  score = nextScore;
  scoreElement.textContent = String(score);

  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = String(bestScore);
    localStorage.setItem("best-2048-score", String(bestScore));
  }
}

function renderBoard(animatedCells = []) {
  const animatedSet = new Set(animatedCells.map(({ row, col }) => `${row}-${col}`));
  boardElement.innerHTML = "";

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement("div");
      const value = board[row][col];
      cell.className = "cell";
      cell.dataset.value = String(value);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", value === 0 ? "Empty cell" : `Tile ${value}`);
      cell.textContent = value === 0 ? "" : String(value);

      if (animatedSet.has(`${row}-${col}`)) {
        cell.classList.add("pop");
      }

      boardElement.appendChild(cell);
    }
  }
}

function slideAndMerge(line) {
  const compacted = line.filter((value) => value !== 0);
  const merged = [];
  const animatedIndexes = [];
  let gained = 0;

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index];
    const next = compacted[index + 1];

    if (current !== 0 && current === next) {
      const doubled = current * 2;
      merged.push(doubled);
      gained += doubled;
      animatedIndexes.push(merged.length - 1);
      index += 1;
    } else {
      merged.push(current);
    }
  }

  while (merged.length < GRID_SIZE) {
    merged.push(0);
  }

  return { line: merged, gained, animatedIndexes };
}

function move(direction) {
  let moved = false;
  let gainedScore = 0;
  const animatedCells = [];

  for (let i = 0; i < GRID_SIZE; i += 1) {
    let originalLine = [];

    if (direction === "left" || direction === "right") {
      originalLine = [...board[i]];
      if (direction === "right") {
        originalLine.reverse();
      }
    } else {
      originalLine = board.map((row) => row[i]);
      if (direction === "down") {
        originalLine.reverse();
      }
    }

    const { line: mergedLine, gained, animatedIndexes } = slideAndMerge(originalLine);
    gainedScore += gained;

    const nextLine =
      direction === "right" || direction === "down"
        ? [...mergedLine].reverse()
        : mergedLine;

    for (let j = 0; j < GRID_SIZE; j += 1) {
      const row = direction === "left" || direction === "right" ? i : j;
      const col = direction === "left" || direction === "right" ? j : i;

      if (board[row][col] !== nextLine[j]) {
        moved = true;
      }

      board[row][col] = nextLine[j];
    }

    animatedIndexes.forEach((animatedIndex) => {
      const adjustedIndex =
        direction === "right" || direction === "down"
          ? GRID_SIZE - 1 - animatedIndex
          : animatedIndex;

      if (direction === "left" || direction === "right") {
        animatedCells.push({ row: i, col: adjustedIndex });
      } else {
        animatedCells.push({ row: adjustedIndex, col: i });
      }
    });
  }

  if (!moved) {
    return;
  }

  updateScore(score + gainedScore);
  addRandomTile();
  renderBoard(animatedCells);
  refreshStatus();
}

function canMove() {
  if (getEmptyCells().length > 0) {
    return true;
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col];
      if (row + 1 < GRID_SIZE && board[row + 1][col] === value) {
        return true;
      }
      if (col + 1 < GRID_SIZE && board[row][col + 1] === value) {
        return true;
      }
    }
  }

  return false;
}

function refreshStatus() {
  const flatBoard = board.flat();

  if (!hasWon && flatBoard.includes(2048)) {
    hasWon = true;
    statusElement.textContent = "2048 reached. You can keep going if you want.";
    return;
  }

  if (!canMove()) {
    statusElement.textContent = "No more moves. Start a new game and try again.";
    return;
  }

  statusElement.textContent = "Merge tiles and keep the board alive.";
}

function startGame() {
  board = createEmptyBoard();
  updateScore(0);
  hasWon = false;

  for (let count = 0; count < START_TILES; count += 1) {
    addRandomTile();
  }

  renderBoard();
  refreshStatus();
}

function handleKeydown(event) {
  const directionMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  const direction = directionMap[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();
  move(direction);
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event) {
  if (!touchStart) {
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  const threshold = 24;

  touchStart = null;

  if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
    return;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    move(deltaX > 0 ? "right" : "left");
  } else {
    move(deltaY > 0 ? "down" : "up");
  }
}

document.addEventListener("keydown", handleKeydown);
boardElement.addEventListener("touchstart", handleTouchStart, { passive: true });
boardElement.addEventListener("touchend", handleTouchEnd, { passive: true });
newGameButton.addEventListener("click", startGame);

startGame();
