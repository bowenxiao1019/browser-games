const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const speedElement = document.querySelector("#speed");
const overlayElement = document.querySelector("#overlay");
const overlayTitleElement = document.querySelector("#overlay-title");
const overlayMessageElement = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const ROAD_WIDTH = 280;
const ROAD_LEFT = (WIDTH - ROAD_WIDTH) / 2;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

const state = {
  running: false,
  score: 0,
  bestScore: Number(localStorage.getItem("neon-sprint-best") || 0),
  distance: 0,
  speed: 5,
  laneOffset: 0,
  lastTime: 0,
  spawnTimer: 0,
  car: null,
  traffic: [],
  stars: [],
};

bestScoreElement.textContent = String(state.bestScore);

function laneCenter(lane) {
  return ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function createStars() {
  state.stars = Array.from({ length: 36 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 1.2 + 0.4,
  }));
}

function resetGame() {
  state.running = false;
  state.score = 0;
  state.distance = 0;
  state.speed = 5;
  state.laneOffset = 0;
  state.lastTime = 0;
  state.spawnTimer = 0;
  state.traffic = [];
  state.car = {
    lane: 1,
    width: 48,
    height: 96,
    y: HEIGHT - 140,
  };
  createStars();
  updateHud();
  showOverlay(
    "Ready to race?",
    "Use left and right arrows or A and D to switch lanes."
  );
  draw();
}

function updateHud() {
  scoreElement.textContent = String(Math.floor(state.score));
  speedElement.textContent = `${(state.speed / 5).toFixed(1)}x`;

  if (state.score > state.bestScore) {
    state.bestScore = Math.floor(state.score);
    bestScoreElement.textContent = String(state.bestScore);
    localStorage.setItem("neon-sprint-best", String(state.bestScore));
  }
}

function showOverlay(title, message) {
  overlayTitleElement.textContent = title;
  overlayMessageElement.textContent = message;
  overlayElement.classList.remove("hidden");
}

function hideOverlay() {
  overlayElement.classList.add("hidden");
}

function startGame() {
  resetGame();
  state.running = true;
  hideOverlay();
  requestAnimationFrame(loop);
}

function moveCar(direction) {
  if (!state.car) {
    return;
  }

  state.car.lane = Math.max(0, Math.min(LANE_COUNT - 1, state.car.lane + direction));
}

function spawnTraffic() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const speedBoost = Math.random() * 1.8 + 0.8;
  state.traffic.push({
    lane,
    x: laneCenter(lane),
    y: -120,
    width: 46,
    height: 92,
    color: ["#ff8a5b", "#ffd166", "#7ef7c9", "#ff5c8a"][Math.floor(Math.random() * 4)],
    speed: state.speed + speedBoost,
  });
}

function updateStars(delta) {
  for (const star of state.stars) {
    star.y += star.speed * delta * 0.08;
    if (star.y > HEIGHT) {
      star.y = -4;
      star.x = Math.random() * WIDTH;
    }
  }
}

function updateTraffic(delta) {
  state.spawnTimer += delta;
  const spawnDelay = Math.max(340, 900 - state.speed * 55);

  if (state.spawnTimer >= spawnDelay) {
    state.spawnTimer = 0;
    spawnTraffic();
  }

  state.traffic = state.traffic.filter((car) => {
    car.y += car.speed * delta * 0.1;
    if (car.y - car.height / 2 > HEIGHT) {
      state.score += 12;
      return false;
    }
    return true;
  });
}

function intersects(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height
  );
}

function update(delta) {
  updateStars(delta);

  if (!state.running) {
    return;
  }

  state.distance += delta;
  state.score += delta * 0.01;
  state.speed = 5 + Math.min(8, state.distance * 0.00008);
  state.laneOffset += state.speed * delta * 0.14;

  updateTraffic(delta);

  const playerBox = {
    x: laneCenter(state.car.lane),
    y: state.car.y,
    width: state.car.width,
    height: state.car.height,
  };

  for (const trafficCar of state.traffic) {
    if (intersects(playerBox, trafficCar)) {
      state.running = false;
      updateHud();
      showOverlay(
        "Race over",
        `You scored ${Math.floor(state.score)}. Tap start or restart to try again.`
      );
      return;
    }
  }

  updateHud();
}

function drawBackground() {
  context.clearRect(0, 0, WIDTH, HEIGHT);

  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#0b1320");
  gradient.addColorStop(1, "#03060c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of state.stars) {
    context.fillStyle = "rgba(255,255,255,0.75)";
    context.fillRect(star.x, star.y, star.size, star.size);
  }

  context.fillStyle = "#0a1220";
  context.fillRect(ROAD_LEFT - 28, 0, ROAD_WIDTH + 56, HEIGHT);

  context.fillStyle = "#1a2333";
  context.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, HEIGHT);

  context.strokeStyle = "rgba(255,255,255,0.2)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(ROAD_LEFT, 0);
  context.lineTo(ROAD_LEFT, HEIGHT);
  context.moveTo(ROAD_LEFT + ROAD_WIDTH, 0);
  context.lineTo(ROAD_LEFT + ROAD_WIDTH, HEIGHT);
  context.stroke();

  context.strokeStyle = "#f5f5f5";
  context.lineWidth = 6;

  for (let lane = 1; lane < LANE_COUNT; lane += 1) {
    const x = ROAD_LEFT + lane * LANE_WIDTH;
    for (let y = -60 + (state.laneOffset % 80); y < HEIGHT; y += 80) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + 42);
      context.stroke();
    }
  }
}

function drawCar(x, y, width, height, color, isPlayer = false) {
  context.save();
  context.translate(x, y);

  context.fillStyle = color;
  context.fillRect(-width / 2, -height / 2, width, height);

  context.fillStyle = isPlayer ? "#101827" : "#121212";
  context.fillRect(-width / 2 + 8, -height / 2 + 16, width - 16, height - 34);

  context.fillStyle = isPlayer ? "#7df9ff" : "#ffd8a8";
  context.fillRect(-width / 2 + 6, -height / 2 + 8, width - 12, 10);
  context.fillStyle = isPlayer ? "#ff8a5b" : "#ff5c8a";
  context.fillRect(-width / 2 + 6, height / 2 - 18, width - 12, 10);

  context.fillStyle = "#0a0a0a";
  context.fillRect(-width / 2 - 4, -height / 2 + 12, 6, 22);
  context.fillRect(width / 2 - 2, -height / 2 + 12, 6, 22);
  context.fillRect(-width / 2 - 4, height / 2 - 34, 6, 22);
  context.fillRect(width / 2 - 2, height / 2 - 34, 6, 22);

  context.restore();
}

function draw() {
  drawBackground();

  for (const trafficCar of state.traffic) {
    drawCar(trafficCar.x, trafficCar.y, trafficCar.width, trafficCar.height, trafficCar.color);
  }

  if (state.car) {
    drawCar(
      laneCenter(state.car.lane),
      state.car.y,
      state.car.width,
      state.car.height,
      "#4df0ff",
      true
    );
  }
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const delta = Math.min(32, timestamp - state.lastTime);
  state.lastTime = timestamp;

  update(delta);
  draw();

  if (state.running) {
    requestAnimationFrame(loop);
  }
}

function handleKeydown(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    event.preventDefault();
    moveCar(-1);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    event.preventDefault();
    moveCar(1);
  }
}

function handleCanvasTap(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  if (x < bounds.width / 2) {
    moveCar(-1);
  } else {
    moveCar(1);
  }
}

document.addEventListener("keydown", handleKeydown);
canvas.addEventListener("pointerdown", handleCanvasTap);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
