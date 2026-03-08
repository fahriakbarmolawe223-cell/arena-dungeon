/* ========================================
   ARENA DUNGEON — Game Engine (Part 1: Setup & State)
   ======================================== */

const TILE = 32;
const MAP_COLS = 40;
const MAP_ROWS = 25;
const CANVAS_W = MAP_COLS * TILE;
const CANVAS_H = MAP_ROWS * TILE;
const MATCH_DURATION = 300; // 5 minutes

// Dungeon map: 0=floor, 1=wall
const GAME_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Game state
let gamePhase = 'lobby'; // lobby | playing | ended
let matchTimer = MATCH_DURATION;
let players = new Map();
let enemies = [];
let projectiles = [];
let chests = [];
let traps = [];
let boss = null;
let currentEvent = null;
let eventTimer = 0;
let nextChestTime = 25;
let nextBossTime = 120;
let nextEventTime = 60;
let enemySpawnTimer = 3;
let playerSpawnIndex = 0;

let canvas, ctx;
let network;
let lastTime = 0;

// ========================================
// ASSET LOADING
// ========================================
const ASSETS = {
  chest: new Image(),
  trap: new Image(),
  wallTile: new Image(),
  floorTile: new Image()
};
ASSETS.chest.src = 'Chest.png';
ASSETS.trap.src = 'Trap.png';
ASSETS.wallTile.src = 'Wall Tile.png';
ASSETS.floorTile.src = 'Floor Tile.png';

// ========================================
// INITIALIZATION
// ========================================

function initGame() {
  canvas = document.getElementById('arena');
  ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
}

function scaleCanvas() {
  const scaleX = window.innerWidth / CANVAS_W;
  const scaleY = window.innerHeight / CANVAS_H;
  const scale = Math.min(scaleX, scaleY);
  canvas.style.width = (CANVAS_W * scale) + 'px';
  canvas.style.height = (CANVAS_H * scale) + 'px';
}

async function initHost() {
  network = new HostNetwork();
  network.onPlayerConnect = onPlayerConnect;
  network.onPlayerMessage = onPlayerMessage;
  network.onPlayerDisconnect = onPlayerDisconnect;

  try {
    await network.init();
    document.getElementById('connection-status').textContent = '✓ Ready for connections';
    document.getElementById('room-code').innerHTML =
      '<span>ROOM CODE</span>' + network.roomCode;

    // Generate QR code
    const url = network.getControllerUrl();
    new QRCode(document.getElementById('qr-container'), {
      text: url, width: 200, height: 200,
      colorDark: '#1a1410', colorLight: '#ffffff'
    });
    console.log('Controller URL:', url);
  } catch (e) {
    document.getElementById('connection-status').textContent = '✗ Connection failed: ' + e;
    console.error(e);
  }
}

// ========================================
// NETWORK CALLBACKS
// ========================================

function onPlayerConnect(peerId) {
  console.log('Player connected:', peerId);
  updateLobbyUI();
}

function onPlayerMessage(peerId, data) {
  if (!data || !data.type) return;

  switch (data.type) {
    case 'join': {
      if (players.has(peerId)) return;
      if (players.size >= 8) return;
      const p = createPlayer(peerId, data.name, data.className, playerSpawnIndex++);
      players.set(peerId, p);
      network.sendTo(peerId, { type: 'joined', playerId: peerId });
      updateLobbyUI();
      break;
    }
    case 'input': {
      const p = players.get(peerId);
      if (!p) return;
      p.inputMX = data.mx || 0;
      p.inputMY = data.my || 0;
      if (data.a1) p.inputA1 = true;
      if (data.a2) p.inputA2 = true;
      if (data.a3) p.inputA3 = true;
      break;
    }
    case 'upgrade': {
      const p = players.get(peerId);
      if (!p || !p.pendingLevelUp || !p.levelUpChoices) return;
      const choice = p.levelUpChoices[data.index];
      if (choice) {
        applyUpgrade(p, choice);
        p.pendingLevelUp = false;
        p.levelUpChoices = null;
        network.sendTo(peerId, { type: 'upgrade_done' });
      }
      break;
    }
  }
}

function onPlayerDisconnect(peerId) {
  players.delete(peerId);
  updateLobbyUI();
}

// ========================================
// LOBBY
// ========================================

function updateLobbyUI() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  for (const [id, p] of players) {
    const div = document.createElement('div');
    div.className = 'player-slot filled';
    div.innerHTML = '<div class="name" style="color:' + p.color + '">' +
      p.name + '</div><div class="class-name">' +
      CLASS_DATA[p.className].name + '</div>';
    list.appendChild(div);
  }
  document.getElementById('player-count').textContent =
    players.size + '/8 players joined (min 1 to start)';

  const btn = document.getElementById('start-btn');
  btn.className = players.size >= 1 ? 'visible' : '';
}

function startMatch() {
  if (gamePhase !== 'lobby' || players.size < 1) return;
  gamePhase = 'playing';
  matchTimer = MATCH_DURATION;

  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game-container').className = 'active';
  document.getElementById('hud-overlay').className = 'active';

  network.broadcast({ type: 'start' });

  // Initial enemy spawn
  for (let i = 0; i < 6 + players.size * 2; i++) spawnEnemy();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}
