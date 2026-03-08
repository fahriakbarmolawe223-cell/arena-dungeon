/* ========================================
   ARENA DUNGEON — Enemy System
   ======================================== */

const ENEMY_TYPES = {
  goblin: {
    name: 'Goblin', color: '#88cc44', hp: 30, damage: 5,
    speed: 1.2, radius: 10, exp: 10, attackCd: 1.5
  },
  skeleton: {
    name: 'Skeleton', color: '#bbbbbb', hp: 60, damage: 10,
    speed: 0.9, radius: 12, exp: 25, attackCd: 2.0
  },
  brute: {
    name: 'Brute', color: '#cc4444', hp: 120, damage: 18,
    speed: 0.5, radius: 16, exp: 25, attackCd: 2.5
  }
};

let enemyIdCounter = 0;

/**
 * Create an enemy at specified tile coords.
 */
function createEnemy(type, tileX, tileY) {
  const data = ENEMY_TYPES[type];
  return {
    id: ++enemyIdCounter,
    type: type,
    name: data.name,
    color: data.color,
    x: tileX * 32 + 16,
    y: tileY * 32 + 16,
    radius: data.radius,
    hp: data.hp,
    maxHp: data.hp,
    damage: data.damage,
    speed: data.speed,
    exp: data.exp,
    attackCd: data.attackCd,
    attackTimer: 0,
    targetId: null,
    dead: false,
    slowed: false,
    slowTimer: 0,
    slowAmount: 0,
    poisoned: false,
    poisonTimer: 0,
    poisonDmg: 0,
    knockbackX: 0,
    knockbackY: 0,
    hitFlash: 0
  };
}

/**
 * Create a boss.
 */
function createBoss(playerCount) {
  const tile = getRandomFloorTile(GAME_MAP);
  return {
    id: ++enemyIdCounter,
    type: 'boss',
    name: 'Dungeon Lord',
    color: '#ff2200',
    x: tile.x * 32 + 16,
    y: tile.y * 32 + 16,
    radius: 24,
    hp: 400 + (playerCount * 100),
    maxHp: 400 + (playerCount * 100),
    damage: 25,
    speed: 0.7,
    exp: 100,
    attackCd: 2.0,
    attackTimer: 0,
    targetId: null,
    dead: false,
    slowed: false,
    slowTimer: 0,
    slowAmount: 0,
    poisoned: false,
    poisonTimer: 0,
    poisonDmg: 0,
    knockbackX: 0,
    knockbackY: 0,
    hitFlash: 0,
    isBoss: true,
    aoeCd: 5,
    aoeTimer: 0,
    aoeWarning: 0
  };
}

/**
 * Update an enemy's AI and movement.
 */
function updateEnemy(enemy, players, dt, map) {
  if (enemy.dead) return;

  // Hit flash decay
  if (enemy.hitFlash > 0) enemy.hitFlash -= dt * 4;

  // Status effect updates
  if (enemy.slowed) {
    enemy.slowTimer -= dt;
    if (enemy.slowTimer <= 0) {
      enemy.slowed = false;
      enemy.slowAmount = 0;
    }
  }

  if (enemy.poisoned) {
    enemy.poisonTimer -= dt;
    if (enemy.poisonTimer <= 0) {
      enemy.poisoned = false;
    }
  }

  // Knockback
  if (Math.abs(enemy.knockbackX) > 0.1 || Math.abs(enemy.knockbackY) > 0.1) {
    enemy.x += enemy.knockbackX * dt * 60;
    enemy.y += enemy.knockbackY * dt * 60;
    enemy.knockbackX *= 0.85;
    enemy.knockbackY *= 0.85;
    clampToMap(enemy, map);
    return; // Skip AI while in knockback
  }

  // Find nearest alive, visible player
  let nearest = null;
  let nearestDist = Infinity;
  for (const p of players) {
    if (p.dead || p.invisible) continue;
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = p;
    }
  }

  enemy.targetId = nearest ? nearest.id : null;

  if (nearest && nearestDist < 300) {
    // Move toward target
    const dx = nearest.x - enemy.x;
    const dy = nearest.y - enemy.y;
    const spd = enemy.speed * (enemy.slowed ? (1 - enemy.slowAmount) : 1);
    const mx = (dx / nearestDist) * spd * dt * 60;
    const my = (dy / nearestDist) * spd * dt * 60;

    const newX = enemy.x + mx;
    const newY = enemy.y + my;

    // Wall collision
    if (!isWall(newX, enemy.y, enemy.radius, map)) enemy.x = newX;
    if (!isWall(enemy.x, newY, enemy.radius, map)) enemy.y = newY;

    // Attack if in range
    enemy.attackTimer -= dt;
    if (nearestDist < enemy.radius + nearest.radius + 8 && enemy.attackTimer <= 0) {
      enemy.attackTimer = enemy.attackCd;
      return { type: 'attack', target: nearest, damage: enemy.damage };
    }
  }

  // Boss AoE attack
  if (enemy.isBoss) {
    enemy.aoeTimer -= dt;
    if (enemy.aoeTimer <= 0) {
      enemy.aoeTimer = enemy.aoeCd;
      enemy.aoeWarning = 1.0; // Warning indicator for 1 second before AoE
      return { type: 'boss_aoe', x: enemy.x, y: enemy.y, radius: 80, damage: enemy.damage };
    }
    if (enemy.aoeWarning > 0) {
      enemy.aoeWarning -= dt;
    }
  }

  clampToMap(enemy, map);
  return null;
}

/**
 * Check if a position is inside a wall tile.
 */
function isWall(x, y, radius, map) {
  const ts = 32;
  // Check corners of bounding box
  const checks = [
    { cx: x - radius, cy: y - radius },
    { cx: x + radius, cy: y - radius },
    { cx: x - radius, cy: y + radius },
    { cx: x + radius, cy: y + radius }
  ];
  for (const c of checks) {
    const tx = Math.floor(c.cx / ts);
    const ty = Math.floor(c.cy / ts);
    if (tx < 0 || ty < 0 || ty >= map.length || tx >= map[0].length) return true;
    if (map[ty][tx] === 1) return true;
  }
  return false;
}

/**
 * Clamp entity position to map bounds.
 */
function clampToMap(entity, map) {
  const ts = 32;
  const r = entity.radius;
  entity.x = Math.max(r, Math.min(entity.x, map[0].length * ts - r));
  entity.y = Math.max(r, Math.min(entity.y, map.length * ts - r));
}

/**
 * Get random walkable tile positions for spawning.
 * Ensures the tile AND all 8 neighbours are floor (not wall)
 * so that enemies with radius never overlap obstacles.
 */
function getRandomFloorTile(map) {
  const rows = map.length;
  const cols = map[0].length;
  let attempts = 200;
  while (attempts-- > 0) {
    const tx = Math.floor(Math.random() * cols);
    const ty = Math.floor(Math.random() * rows);
    // Don't spawn too close to edges
    if (tx < 2 || tx >= cols - 2 || ty < 2 || ty >= rows - 2) continue;
    // Check that this tile and all 8 surrounding tiles are floor
    if (isClearSpawn(tx, ty, map)) {
      return { x: tx, y: ty };
    }
  }
  return { x: 10, y: 10 }; // Fallback
}

/**
 * Check that the tile at (tx,ty) and all 8 neighbours are floor (value 0).
 */
function isClearSpawn(tx, ty, map) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const r = ty + dy;
      const c = tx + dx;
      if (r < 0 || r >= map.length || c < 0 || c >= map[0].length) return false;
      if (map[r][c] !== 0) return false;
    }
  }
  return true;
}
