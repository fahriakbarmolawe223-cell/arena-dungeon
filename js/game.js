/* ========================================
   ARENA DUNGEON — Game Engine (Part 1: Setup & State)
   ======================================== */

const TILE = 32;
const MAP_COLS = 40;
const MAP_ROWS = 25;
const CANVAS_W = MAP_COLS * TILE;
const CANVAS_H = MAP_ROWS * TILE;
const MATCH_DURATION = 300; // 5 minutes

const BASE_ARENA_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Dungeon map: 0=floor, 1=wall
let GAME_MAP = JSON.parse(JSON.stringify(BASE_ARENA_MAP));

// Game state
let gameMode = 'arena'; // arena | dungeon
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
let visibilityMap = []; // For dungeon mode

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
  floorTile: new Image(),
  boss: new Image(),
  brute: new Image(),
  goblin: new Image(),
  skeleton: new Image(),
  rogue: new Image(),
  mage: new Image(),
  ranger: new Image(),
  knight: new Image()
};
ASSETS.chest.src = 'Chest.png';
ASSETS.trap.src = 'Trap.png';
ASSETS.wallTile.src = 'Wall Tile.png';
ASSETS.floorTile.src = 'Floor Tile.png';
ASSETS.boss.src = 'Boss (Dungeon Lord).png';
ASSETS.brute.src = 'Brute.png';
ASSETS.goblin.src = 'Goblin.png';
ASSETS.skeleton.src = 'Skeleton.png';
ASSETS.rogue.src = 'Rogue.png';
ASSETS.mage.src = 'Mage.png';
ASSETS.ranger.src = 'Ranger.png';
ASSETS.knight.src = 'Warrior.png';

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
    case 'interact': {
      if (gameMode !== 'dungeon') return;
      const p = players.get(peerId);
      if (!p || p.dead) return;
      
      // Basic interact check (e.g. open chest)
      for (let i = chests.length - 1; i >= 0; i--) {
        const c = chests[i];
        const dx = p.x - c.x, dy = p.y - c.y;
        if (dx * dx + dy * dy < 1600) { // 40px radius
          collectChest(p, c);
          chests.splice(i, 1);
          break; // Only interact with one thing
        }
      }
      break;
    }
    case 'use_item': {
      if (gameMode !== 'dungeon') return;
      const p = players.get(peerId);
      if (!p || p.dead) return;
      const slot = data.slot - 1; // 0-indexed
      if (p.inventory[slot] > 0) {
        if (slot === 0) { // Torch
          p.torchLevel = Math.min(100, p.torchLevel + 50);
          p.inventory[0]--;
          addParticle(p.x, p.y, '#ffaa00', 10, 2, 0.5);
        } else if (slot === 1) { // Potion
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
          p.inventory[1]--;
          addParticle(p.x, p.y, '#44ff44', 10, 2, 0.5);
        }
      }
      break;
    }
    case 'shake': {
      if (gameMode !== 'dungeon') return;
      const p = players.get(peerId);
      if (!p || p.dead) return;
      if (p.torchLevel < 50) {
        p.torchLevel = Math.min(100, p.torchLevel + 10);
        addParticle(p.x, p.y, '#ffaa00', 5, 2, 0.5);
        addDamageNumber(p.x, p.y - 10, '+Torch', '#ffaa00');
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

  const modeSelect = document.getElementById('game-mode');
  gameMode = modeSelect ? modeSelect.value : 'arena';

  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game-container').className = 'active';
  document.getElementById('hud-overlay').className = 'active';

  // Setup Map Based on Mode
  if (gameMode === 'dungeon') {
    generateDungeonMap();
  } else {
    // Reset to base Arena Map if replaying (GAME_MAP is currently a const, we'll redefine it in a bit)
    GAME_MAP = JSON.parse(JSON.stringify(BASE_ARENA_MAP));
  }

  // Respawn everyone taking new map into consideration
  for (const [id, p] of players) {
    respawnPlayer(p);
  }

  network.broadcast({ type: 'start', mode: gameMode });

  // Initial enemy spawn
  for (let i = 0; i < 6 + players.size * 2; i++) spawnEnemy();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ========================================
// MAP GENERATION
// ========================================

function generateDungeonMap() {
  // Initialize filled with walls
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      GAME_MAP[r][c] = 1;
    }
  }

  // Create visibility map initialized to 0 (unknown)
  visibilityMap = Array(MAP_ROWS).fill(0).map(() => Array(MAP_COLS).fill(0));

  const rooms = [];
  const numRooms = 12 + Math.floor(Math.random() * 4); // 12-15 rooms

  // Helper to check standard overlap
  const isValidRoom = (r, c, w, h) => {
    if (r < 1 || c < 1 || r + h > MAP_ROWS - 2 || c + w > MAP_COLS - 2) return false;
    for (const room of rooms) {
      if (r < room.r + room.h + 2 && r + h + 2 > room.r &&
          c < room.c + room.w + 2 && c + w + 2 > room.c) {
        return false;
      }
    }
    return true;
  };

  // Generate rooms
  for (let i = 0; i < 50 && rooms.length < numRooms; i++) {
    const w = 4 + Math.floor(Math.random() * 4);
    const h = 4 + Math.floor(Math.random() * 4);
    const r = 2 + Math.floor(Math.random() * (MAP_ROWS - h - 4));
    const c = 2 + Math.floor(Math.random() * (MAP_COLS - w - 4));

    if (isValidRoom(r, c, w, h)) {
      rooms.push({ r, c, w, h, x: Math.floor(c + w/2), y: Math.floor(r + h/2) });
      for (let rr = r; rr < r + h; rr++) {
        for (let cc = c; cc < c + w; cc++) {
          GAME_MAP[rr][cc] = 0;
        }
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];
    
    // Horizontal then vertical
    let r1 = prev.y, c1 = prev.x;
    let r2 = curr.y, c2 = curr.x;

    while (c1 !== c2) {
      GAME_MAP[r1][c1] = 0;
      GAME_MAP[r1 + 1][c1] = 0; // 2 tile wide corridors
      c1 += (c2 > c1) ? 1 : -1;
    }
    while (r1 !== r2) {
      GAME_MAP[r1][c1] = 0;
      GAME_MAP[r1][c1 + 1] = 0;
      r1 += (r2 > r1) ? 1 : -1;
    }
  }
}
