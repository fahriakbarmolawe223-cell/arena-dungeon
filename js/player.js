/* ========================================
   ARENA DUNGEON — Player System
   ======================================== */

// Class definitions
const CLASS_DATA = {
  knight: {
    name: 'Knight', color: '#4488ff', icon: '⚔️',
    hp: 150, damage: 15, speed: 2.2, attackRange: 28,
    abilities: [
      { name: 'Shield Block', icon: '🛡️', cooldown: 8, type: 'shield' },
      { name: 'Charge',       icon: '💨', cooldown: 6, type: 'charge' },
      { name: 'Spin Slash',   icon: '🌀', cooldown: 10, type: 'spin' }
    ]
  },
  ranger: {
    name: 'Ranger', color: '#44cc44', icon: '🏹',
    hp: 90, damage: 12, speed: 2.8, attackRange: 200,
    abilities: [
      { name: 'Arrow Shot',  icon: '➡️', cooldown: 1.8, type: 'arrow' },
      { name: 'Multi Arrow', icon: '🔱', cooldown: 8, type: 'multi_arrow' },
      { name: 'Trap',        icon: '⚡', cooldown: 12, type: 'trap' }
    ]
  },
  mage: {
    name: 'Mage', color: '#bb44ff', icon: '🔮',
    hp: 70, damage: 20, speed: 2.4, attackRange: 180,
    abilities: [
      { name: 'Fireball',  icon: '🔥', cooldown: 2.5, type: 'fireball' },
      { name: 'Lightning', icon: '⚡', cooldown: 8, type: 'lightning' },
      { name: 'Teleport',  icon: '✨', cooldown: 10, type: 'teleport' }
    ]
  },
  rogue: {
    name: 'Rogue', color: '#ffaa00', icon: '🗡️',
    hp: 85, damage: 14, speed: 3.2, attackRange: 26,
    abilities: [
      { name: 'Dash',       icon: '💨', cooldown: 3, type: 'dash' },
      { name: 'Invisibility', icon: '👻', cooldown: 12, type: 'invis' },
      { name: 'Poison Dagger', icon: '🗡️', cooldown: 5, type: 'poison' }
    ]
  }
};

// Level-up EXP requirements (index 0 = level 1→2, etc.)
const EXP_TABLE = [100, 200, 300, 400, 500, 600, 700, 800, 900];

// Spawn points (tile coordinates)
const SPAWN_POINTS = [
  { x: 3, y: 3 },
  { x: 36, y: 3 },
  { x: 3, y: 21 },
  { x: 36, y: 21 },
  { x: 20, y: 3 },
  { x: 20, y: 21 },
  { x: 3, y: 12 },
  { x: 36, y: 12 }
];

// Available upgrades
const UPGRADES = [
  { name: 'Swift Strikes',   desc: '+25% attack speed',           effect: 'attackSpeed',  value: 0.25 },
  { name: 'Poison Touch',    desc: 'Attacks apply poison (3s)',   effect: 'poison',       value: 3 },
  { name: 'Flame Infusion',  desc: '+30% fire damage added',     effect: 'fireDmg',      value: 0.30 },
  { name: 'Fleet Foot',      desc: '+20% movement speed',        effect: 'moveSpeed',    value: 0.20 },
  { name: 'Life Steal',      desc: 'Heal 12% of damage dealt',   effect: 'lifeSteal',    value: 0.12 },
  { name: 'Cooldown Mastery',desc: 'All cooldowns -25%',         effect: 'cdr',          value: 0.25 },
  { name: 'Fortitude',       desc: '+20% max HP',                effect: 'maxHp',        value: 0.20 },
  { name: 'Raw Power',       desc: '+20% damage',                effect: 'damage',       value: 0.20 },
  { name: 'Frost Touch',     desc: 'Attacks slow enemies 30%',   effect: 'slow',         value: 0.30 },
  { name: 'Chain Shock',     desc: '25% chance to chain lightning', effect: 'chain',     value: 0.25 },
  { name: 'Critical Eye',    desc: '20% chance for 2× damage',   effect: 'crit',         value: 0.20 },
  { name: 'Thorns Aura',     desc: 'Reflect 30% damage taken',   effect: 'thorns',       value: 0.30 }
];

/**
 * Create a new player object.
 */
function createPlayer(peerId, name, className, spawnIndex) {
  const cd = CLASS_DATA[className];
  
  let validSpawn;
  if (typeof gameMode !== 'undefined' && gameMode === 'dungeon') {
    validSpawn = getRandomFloorTile(GAME_MAP);
  } else {
    validSpawn = SPAWN_POINTS[spawnIndex % SPAWN_POINTS.length];
  }

  return {
    id: peerId,
    name: name || 'Player',
    className: className,
    color: cd.color,

    // Position & movement
    x: validSpawn.x * 32 + 16,
    y: validSpawn.y * 32 + 16,
    radius: 12,
    moveX: 0,
    moveY: 0,
    facingX: 0,
    facingY: 1,
    speed: cd.speed,
    baseSpeed: cd.speed,

    // Combat stats
    hp: cd.hp,
    maxHp: cd.hp,
    baseMaxHp: cd.hp,
    damage: cd.damage,
    baseDamage: cd.damage,
    attackRange: cd.attackRange,
    attackSpeed: 1.0,
    attackTimer: 0,

    // Leveling
    level: 1,
    exp: 0,
    expToNext: EXP_TABLE[0],

    // Abilities
    abilities: cd.abilities.map(a => ({
      ...a,
      currentCd: 0,
      baseCooldown: a.cooldown
    })),

    // upgrades applied
    upgrades: [],

    // Status
    kills: 0,
    dead: false,
    respawnTimer: 0,
    invincible: false,
    invincibleTimer: 0,
    invisible: false,
    invisibleTimer: 0,
    shieldBlock: false,
    shieldTimer: 0,
    poisoned: false,
    poisonTimer: 0,
    poisonDmg: 0,
    slowed: false,
    slowTimer: 0,
    slowAmount: 0,
    torchLevel: 100,
    inventory: [1, 0, 0, 0], // [Torch, Potion, Key, Artifact]

    // Input state (from controller)
    inputMX: 0,
    inputMY: 0,
    inputA1: false,
    inputA2: false,
    inputA3: false,

    // Pending level up?
    pendingLevelUp: false,
    levelUpChoices: null
  };
}

/**
 * Apply EXP to a player and check for level up.
 * Returns true if leveled up.
 */
function giveExp(player, amount) {
  if (player.level >= 10) return false;
  player.exp += amount;
  if (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    if (player.level < 10) {
      player.expToNext = EXP_TABLE[player.level - 1];
    } else {
      player.exp = 0;
      player.expToNext = 9999;
    }
    // Stat increases per level
    player.baseMaxHp += 15;
    player.baseDamage += 2;
    recalcStats(player);
    player.hp = player.maxHp; // Full heal on level up
    return true;
  }
  return false;
}

/**
 * Generate 3 random upgrade choices for level up.
 */
function generateLevelUpChoices(player) {
  // Filter out upgrades they already have (some can stack, most shouldn't)
  const available = UPGRADES.filter(u => {
    const count = player.upgrades.filter(pu => pu.effect === u.effect).length;
    return count < 2; // Allow max 2 stacks of same upgrade
  });
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * Apply a chosen upgrade to a player.
 */
function applyUpgrade(player, upgrade) {
  player.upgrades.push(upgrade);
  recalcStats(player);
}

/**
 * Recalculate derived stats from base + upgrades.
 */
function recalcStats(player) {
  let hpMult = 1;
  let dmgMult = 1;
  let spdMult = 1;
  let atkSpdMult = 1;
  let cdrMult = 1;

  for (const u of player.upgrades) {
    switch (u.effect) {
      case 'maxHp':      hpMult += u.value; break;
      case 'damage':     dmgMult += u.value; break;
      case 'moveSpeed':  spdMult += u.value; break;
      case 'attackSpeed': atkSpdMult += u.value; break;
      case 'cdr':        cdrMult *= (1 - u.value); break;
    }
  }

  player.maxHp = Math.floor(player.baseMaxHp * hpMult);
  player.damage = Math.floor(player.baseDamage * dmgMult);
  player.speed = player.baseSpeed * spdMult;
  player.attackSpeed = atkSpdMult;

  // Apply CDR to abilities
  for (const a of player.abilities) {
    a.cooldown = a.baseCooldown * cdrMult;
  }
}

/**
 * Check if player has a specific upgrade effect.
 */
function hasUpgrade(player, effectName) {
  if (!player.upgrades) return false;
  return player.upgrades.some(u => u.effect === effectName);
}

/**
 * Get sum of upgrade values for a specific effect.
 */
function getUpgradeValue(player, effectName) {
  if (!player.upgrades) return 0;
  return player.upgrades
    .filter(u => u.effect === effectName)
    .reduce((sum, u) => sum + u.value, 0);
}

/**
 * Calculate actual damage dealt by a player, including upgrades.
 */
function calcDamage(player, baseDmg) {
  let dmg = baseDmg || player.damage;

  // Fire damage
  const firePct = getUpgradeValue(player, 'fireDmg');
  if (firePct > 0) dmg += Math.floor(dmg * firePct);

  // Critical strike
  const critChance = getUpgradeValue(player, 'crit');
  if (critChance > 0 && Math.random() < critChance) {
    dmg *= 2;
  }

  return Math.floor(dmg);
}

/**
 * Respawn a player at a random spawn point.
 */
function respawnPlayer(player) {
  let validSpawn;
  if (typeof gameMode !== 'undefined' && gameMode === 'dungeon') {
    validSpawn = getRandomFloorTile(GAME_MAP);
  } else {
    validSpawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  }

  player.x = validSpawn.x * 32 + 16;
  player.y = validSpawn.y * 32 + 16;
  player.dead = false;
  player.hp = player.maxHp;
  player.respawnTimer = 0;
  player.invincible = true;
  player.invincibleTimer = 2; // 2 seconds invincibility on spawn
  player.invisible = false;
  player.shieldBlock = false;
  player.poisoned = false;
  player.slowed = false;
}
