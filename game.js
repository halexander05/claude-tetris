'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// ---- Skins ----
// Cada skin: paleta indexada igual que PIECES (0 = vacío, 1..7), fondo y color
// de rejilla (null = leer del tema CSS) y una función de dibujo en píxeles.
function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, w, h, r);
  } else {
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }
}

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - azul pálido
      '#ffb74d', // L - orange
    ],
    bg: null,   // --board-bg del tema
    grid: null, // --grid-color del tema
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },
  neon: {
    name: 'Neon',
    colors: [null, '#00f0ff', '#fff200', '#d000ff', '#39ff14', '#ff073a', '#1f51ff', '#ff8c00'],
    bg: '#000000',
    grid: '#0d0d18',
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = 14;
      context.fillStyle = color;
      context.fillRect(px + 3, py + 3, size - 6, size - 6);
      context.shadowBlur = 0;
      // núcleo brillante
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.fillRect(px + 8, py + 8, size - 16, size - 16);
      context.globalAlpha = 1;
    },
  },
  pastel: {
    name: 'Pastel',
    colors: [null, '#a0e7e5', '#fbe7a1', '#d7b8f3', '#b5ead7', '#ffb7b2', '#aec6ff', '#ffd3b0'],
    bg: '#f7f1ea',
    grid: '#ebe1d6',
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      roundRectPath(context, px + 2, py + 2, size - 4, size - 4, size * 0.25);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(90,70,90,0.18)';
      context.stroke();
      // brillo suave
      roundRectPath(context, px + 6, py + 5, size - 12, Math.max(2, size * 0.18), size * 0.09);
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fill();
      context.globalAlpha = 1;
    },
  },
  pixel: {
    name: 'Pixel art',
    colors: [null, '#3cbcfc', '#f8b800', '#a45ee5', '#58d854', '#e40058', '#6888fc', '#fc7460'],
    bg: '#14142b',
    grid: '#20203d',
    drawBlock(context, px, py, size, color, alpha) {
      const x = Math.round(px), y = Math.round(py);
      const p = Math.max(2, Math.floor(size / 10)); // tamaño del "píxel"
      const s = size - 2;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x + 1, y + 1, s, s);
      // bisel: luz arriba-izquierda, sombra abajo-derecha
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fillRect(x + 1, y + 1, s, p);
      context.fillRect(x + 1, y + 1, p, s);
      context.fillStyle = 'rgba(0,0,0,0.4)';
      context.fillRect(x + 1, y + 1 + s - p, s, p);
      context.fillRect(x + 1 + s - p, y + 1, p, s);
      // textura: damero de píxeles en el interior
      context.fillStyle = 'rgba(0,0,0,0.15)';
      const n = Math.floor((s - 4 * p) / p);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          if ((i + j) % 2 === 0) context.fillRect(x + 1 + 2 * p + j * p, y + 1 + 2 * p + i * p, p, p);
      context.globalAlpha = 1;
    },
  },
};
const SKIN_KEY = 'tetris-skin';

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level-select');

const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;
const START_LEVEL_KEY = 'tetris-start-level';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let gridColor, boardBg;
let skin = SKINS.retro;
let startLevel = loadStartLevel();

function clampStartLevel(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return MIN_START_LEVEL;
  return Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, n));
}

function loadStartLevel() {
  try {
    return clampStartLevel(localStorage.getItem(START_LEVEL_KEY));
  } catch (e) {
    return MIN_START_LEVEL;
  }
}

function saveStartLevel(value) {
  startLevel = clampStartLevel(value);
  startLevelSelect.value = String(startLevel);
  try {
    localStorage.setItem(START_LEVEL_KEY, String(startLevel));
  } catch (e) {
    // localStorage no disponible: el valor vive solo en memoria
  }
}

function speedForLevel(level) {
  return Math.max(100, 1000 - (level - 1) * 90);
}

function readGridColor() {
  // Las variables del tema claro viven en body.light-theme, así que se leen de body.
  const styles = getComputedStyle(document.body);
  gridColor = styles.getPropertyValue('--grid-color').trim();
  boardBg = styles.getPropertyValue('--board-bg').trim();
}

function applyTheme(isLight) {
  document.body.classList.toggle('light-theme', isLight);
  themeToggle.checked = isLight;
  readGridColor();
}

function toggleTheme() {
  const isLight = themeToggle.checked;
  applyTheme(isLight);
  localStorage.setItem('tetris-theme', isLight ? 'light' : 'dark');
  redraw();
}

function applySkin(key) {
  skin = SKINS[key] || SKINS.retro;
  skinSelect.value = SKINS[key] ? key : 'retro';
}

function changeSkin() {
  applySkin(skinSelect.value);
  try { localStorage.setItem(SKIN_KEY, skinSelect.value); } catch (e) { /* sin storage */ }
  skinSelect.blur();
  redraw();
}

function loadSkin() {
  let saved = null;
  try { saved = localStorage.getItem(SKIN_KEY); } catch (e) { /* sin storage */ }
  applySkin(saved);
}

// Repinta al instante (útil en pausa o game over, cuando el loop no dibuja).
function redraw() {
  if (current && board) draw();
  if (next) drawNext();
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.max(startLevel, Math.floor(lines / 10) + 1);
    dropInterval = speedForLevel(level);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  skin.drawBlock(context, x * size, y * size, size, skin.colors[colorIndex], alpha ?? 1);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function clearCanvas(context, w, h) {
  context.clearRect(0, 0, w, h);
  context.fillStyle = skin.bg || boardBg;
  context.fillRect(0, 0, w, h);
}

function drawGrid() {
  ctx.strokeStyle = skin.grid || gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  clearCanvas(ctx, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  clearCanvas(nextCtx, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function blurPauseMenuFocus() {
  // Evita que Space/Enter re-disparen un botón del menú al volver a jugar
  if (pauseMenu.contains(document.activeElement)) document.activeElement.blur();
}

function setControlsVisible(visible) {
  pauseControls.classList.toggle('hidden', !visible);
  controlsBtn.setAttribute('aria-expanded', String(visible));
  controlsBtn.textContent = visible ? 'Ocultar controles' : 'Ver controles';
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  cancelAnimationFrame(animId);
  if (paused) {
    setControlsVisible(false);
    startLevelSelect.value = String(startLevel);
    pauseMenu.classList.remove('hidden');
  } else {
    blurPauseMenuFocus();
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }
}

function restartFromMenu() {
  blurPauseMenuFocus();
  init();
}

function loop(ts) {
  if (paused) return;
  if (gameOver) { draw(); return; }
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  pauseMenu.classList.add('hidden');
  gameOver = false;
  dropInterval = speedForLevel(level);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (e.repeat) return;
    e.preventDefault();
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggle.addEventListener('change', toggleTheme);
skinSelect.addEventListener('change', changeSkin);
skinSelect.addEventListener('keydown', e => {
  // Evita que las teclas del juego cambien la skin si el select tiene foco.
  const gameKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code);
  if (e.code === 'KeyP' || e.code === 'KeyX' || e.code === 'Escape' || (gameKey && !paused && !gameOver)) {
    e.preventDefault();
  }
});

for (let lv = MIN_START_LEVEL; lv <= MAX_START_LEVEL; lv++) {
  startLevelSelect.add(new Option(String(lv), String(lv)));
}
startLevelSelect.value = String(startLevel);
startLevelSelect.addEventListener('change', () => saveStartLevel(startLevelSelect.value));
resumeBtn.addEventListener('click', () => { if (paused) togglePause(); });
pauseRestartBtn.addEventListener('click', restartFromMenu);
controlsBtn.addEventListener('click', () => setControlsVisible(pauseControls.classList.contains('hidden')));

applyTheme(localStorage.getItem('tetris-theme') === 'light');
loadSkin();
init();
