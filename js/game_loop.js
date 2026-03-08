/* ========================================
   ARENA DUNGEON — Game Loop, Update, Render
   ======================================== */

// ========================================
// MAIN GAME LOOP
// ========================================
function gameLoop(timestamp) {
  if (gamePhase !== 'playing') return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  matchTimer -= dt;
  if (matchTimer <= 0) { endMatch(); return; }

  updateAllPlayers(dt);
  updateAllEnemies(dt);
  updateAllProjectiles(dt);
  updateTraps(dt);
  updateChestSpawns(dt);
  updateBossSpawn(dt);
  updateEventSystem(dt);
  updateParticles(dt);
  updateDamageNumbers(dt);
  broadcastState();
}

// ========================================
// PLAYER UPDATE
// ========================================
function updateAllPlayers(dt) {
  for (const [id, p] of players) {
    if (p.dead) {
      p.respawnTimer -= dt;
      if (p.respawnTimer <= 0) respawnPlayer(p);
      continue;
    }
    // Status timers
    if (p.invincible) { p.invincibleTimer -= dt; if (p.invincibleTimer <= 0) p.invincible = false; }
    if (p.invisible) { p.invisibleTimer -= dt; if (p.invisibleTimer <= 0) p.invisible = false; }
    if (p.shieldBlock) { p.shieldTimer -= dt; if (p.shieldTimer <= 0) p.shieldBlock = false; }
    if (p.poisoned) {
      p.poisonTimer -= dt;
      p.hp -= p.poisonDmg * dt;
      if (p.poisonTimer <= 0) p.poisoned = false;
    }
    if (p.slowed) { p.slowTimer -= dt; if (p.slowTimer <= 0) { p.slowed = false; p.slowAmount = 0; } }

    // Ability cooldowns
    for (const a of p.abilities) { if (a.currentCd > 0) a.currentCd -= dt; }

    // Movement
    let mx = p.inputMX, my = p.inputMY;
    if (mx !== 0 || my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 0) { mx /= len; my /= len; }
      p.facingX = mx; p.facingY = my;
      const spd = p.speed * (p.slowed ? (1 - p.slowAmount) : 1);
      const nx = p.x + mx * spd * dt * 60;
      const ny = p.y + my * spd * dt * 60;
      if (!isWall(nx, p.y, p.radius, GAME_MAP)) p.x = nx;
      if (!isWall(p.x, ny, p.radius, GAME_MAP)) p.y = ny;
      clampToMap(p, GAME_MAP);
    }

    // Abilities
    if (p.inputA1 && p.abilities[0].currentCd <= 0) { useAbility(p, 0); p.inputA1 = false; }
    if (p.inputA2 && p.abilities[1].currentCd <= 0) { useAbility(p, 1); p.inputA2 = false; }
    if (p.inputA3 && p.abilities[2].currentCd <= 0) { useAbility(p, 2); p.inputA3 = false; }
    p.inputA1 = false; p.inputA2 = false; p.inputA3 = false;

    // Auto-collect chests
    for (let i = chests.length - 1; i >= 0; i--) {
      const c = chests[i];
      const dx = p.x - c.x, dy = p.y - c.y;
      if (dx * dx + dy * dy < 900) {
        collectChest(p, c);
        chests.splice(i, 1);
      }
    }

    // Check death
    if (p.hp <= 0) killPlayer(p, null);
  }
}

// ========================================
// ABILITIES
// ========================================
function useAbility(player, index) {
  const a = player.abilities[index];
  a.currentCd = a.cooldown;

  switch (a.type) {
    case 'shield':
      player.shieldBlock = true;
      player.shieldTimer = 3;
      addParticle(player.x, player.y, '#4488ff', 8, 1.5, 0.5);
      break;
    case 'charge': {
      const dist = 120;
      const nx = player.x + player.facingX * dist;
      const ny = player.y + player.facingY * dist;
      chargeAttack(player, nx, ny);
      break;
    }
    case 'spin': {
      const dmg = calcDamage(player, player.damage * 1.5);
      spinAttack(player, dmg, 50);
      break;
    }
    case 'arrow':
      spawnProjectile(player, player.facingX, player.facingY, 6, player.damage, 250, '#44cc44');
      break;
    case 'multi_arrow':
      for (let a = -0.3; a <= 0.3; a += 0.3) {
        const cos = Math.cos(a), sin = Math.sin(a);
        const dx = player.facingX * cos - player.facingY * sin;
        const dy = player.facingX * sin + player.facingY * cos;
        spawnProjectile(player, dx, dy, 5, player.damage * 0.8, 200, '#88ff88');
      }
      break;
    case 'trap':
      traps.push({ x: player.x, y: player.y, ownerId: player.id, damage: player.damage * 2, radius: 40, life: 15 });
      addParticle(player.x, player.y, '#ffaa00', 4, 1, 0.4);
      break;
    case 'fireball':
      spawnProjectile(player, player.facingX, player.facingY, 4, player.damage * 1.4, 200, '#ff6600', true);
      break;
    case 'lightning':
      lightningChain(player, 3, player.damage * 1.2, 120);
      break;
    case 'teleport': {
      const tx = player.x + player.facingX * 120;
      const ty = player.y + player.facingY * 120;
      if (!isWall(tx, ty, player.radius, GAME_MAP)) {
        addParticle(player.x, player.y, '#bb44ff', 10, 2, 0.5);
        player.x = tx; player.y = ty;
        addParticle(player.x, player.y, '#bb44ff', 10, 2, 0.5);
      }
      clampToMap(player, GAME_MAP);
      break;
    }
    case 'dash': {
      const dd = 80;
      const nx = player.x + player.facingX * dd;
      const ny = player.y + player.facingY * dd;
      if (!isWall(nx, ny, player.radius, GAME_MAP)) { player.x = nx; player.y = ny; }
      clampToMap(player, GAME_MAP);
      addParticle(player.x, player.y, '#ffaa00', 6, 2, 0.4);
      break;
    }
    case 'invis':
      player.invisible = true;
      player.invisibleTimer = 3;
      break;
    case 'poison': {
      const dmg = calcDamage(player, player.damage * 1.3);
      meleeAttack(player, dmg, true);
      break;
    }
  }
}

function spawnProjectile(owner, dx, dy, speed, dmg, range, color, aoe) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  projectiles.push({
    x: owner.x + (dx / len) * 16, y: owner.y + (dy / len) * 16,
    vx: (dx / len) * speed, vy: (dy / len) * speed,
    damage: calcDamage(owner, dmg), ownerId: owner.id,
    color: color, distTraveled: 0, maxRange: range,
    radius: 4, aoe: aoe || false, aoeRadius: 40
  });
}

function chargeAttack(player, tx, ty) {
  const steps = 8;
  const sx = player.x, sy = player.y;
  for (let i = 1; i <= steps; i++) {
    const nx = sx + (tx - sx) * (i / steps);
    const ny = sy + (ty - sy) * (i / steps);
    if (isWall(nx, ny, player.radius, GAME_MAP)) break;
    player.x = nx; player.y = ny;
  }
  clampToMap(player, GAME_MAP);
  const dmg = calcDamage(player, player.damage * 1.8);
  hitNearby(player, dmg, 35);
  addParticle(player.x, player.y, '#4488ff', 12, 3, 0.6);
}

function spinAttack(player, dmg, radius) {
  hitNearby(player, dmg, radius);
  addParticle(player.x, player.y, '#ffffff', 15, 3, 0.5);
}

function meleeAttack(player, dmg, applyPoison) {
  const targets = findNearbyTargets(player, 35);
  for (const t of targets) {
    dealDamageToEntity(t, dmg, player);
    if (applyPoison && !t.dead) {
      t.poisoned = true; t.poisonTimer = 5; t.poisonDmg = 3;
    }
  }
  if (targets.length === 0) {
    addParticle(player.x + player.facingX * 20, player.y + player.facingY * 20, '#ffaa00', 3, 1, 0.3);
  }
}

function lightningChain(player, chainCount, dmg, radius) {
  let x = player.x, y = player.y;
  let hitIds = new Set([player.id]);
  for (let c = 0; c < chainCount; c++) {
    let nearest = null, nearDist = radius;
    const allTargets = [...enemies, ...players.values()];
    for (const t of allTargets) {
      if (t.dead || hitIds.has(t.id)) continue;
      const d = Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2);
      if (d < nearDist) { nearDist = d; nearest = t; }
    }
    if (!nearest) break;
    hitIds.add(nearest.id);
    dealDamageToEntity(nearest, calcDamage(player, dmg), player);
    addParticle(nearest.x, nearest.y, '#aaddff', 6, 2, 0.4);
    x = nearest.x; y = nearest.y;
  }
}

function hitNearby(player, dmg, radius) {
  const targets = findNearbyTargets(player, radius);
  for (const t of targets) dealDamageToEntity(t, dmg, player);
}

function findNearbyTargets(player, radius) {
  const results = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const d = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
    if (d < radius + e.radius) results.push(e);
  }
  for (const [id, p] of players) {
    if (p.dead || id === player.id) continue;
    const d = Math.sqrt((p.x - player.x) ** 2 + (p.y - player.y) ** 2);
    if (d < radius + p.radius) results.push(p);
  }
  if (boss && !boss.dead) {
    const d = Math.sqrt((boss.x - player.x) ** 2 + (boss.y - player.y) ** 2);
    if (d < radius + boss.radius) results.push(boss);
  }
  return results;
}

// ========================================
// DAMAGE
// ========================================
function dealDamageToEntity(target, dmg, attacker) {
  if (target.dead) return;
  if (target.invincible) return;
  if (target.shieldBlock) dmg = Math.floor(dmg * 0.2);

  target.hp -= dmg;
  target.hitFlash = 1;
  addDamageNumber(target.x, target.y - target.radius, dmg, '#ff4444');
  addParticle(target.x, target.y, '#ff4444', 3, 1.5, 0.3);

  // Knockback
  if (attacker) {
    const dx = target.x - attacker.x, dy = target.y - attacker.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    target.knockbackX = (dx / len) * 2;
    target.knockbackY = (dy / len) * 2;
  }

  // Attacker upgrades
  if (attacker) {
    // Life steal
    const ls = getUpgradeValue(attacker, 'lifeSteal');
    if (ls > 0 && attacker.hp !== undefined) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * ls);
    }
    // Slow
    const slow = getUpgradeValue(attacker, 'slow');
    if (slow > 0) { target.slowed = true; target.slowTimer = 2; target.slowAmount = slow; }
    // Poison
    if (hasUpgrade(attacker, 'poison')) {
      target.poisoned = true; target.poisonTimer = 3; target.poisonDmg = 2;
    }
  }

  // Thorns
  if (target.upgrades && getUpgradeValue(target, 'thorns') > 0 && attacker) {
    const thornsDmg = Math.floor(dmg * getUpgradeValue(target, 'thorns'));
    if (attacker.hp !== undefined) {
      attacker.hp -= thornsDmg;
      addDamageNumber(attacker.x, attacker.y - 10, thornsDmg, '#aa44ff');
    }
  }

  // Check death
  if (target.hp <= 0) {
    target.dead = true;
    if (target.id && players.has(target.id)) {
      killPlayer(target, attacker);
    } else {
      killEnemy(target, attacker);
    }
  }
}

function killPlayer(player, killer) {
  player.dead = true;
  player.hp = 0;
  player.respawnTimer = 5;
  addParticle(player.x, player.y, player.color, 20, 3, 0.8);
  if (killer && killer.id && players.has(killer.id)) {
    killer.kills++;
    const leveled = giveExp(killer, 50);
    if (leveled) triggerLevelUp(killer);
  }
  network.sendTo(player.id, { type: 'died', respawn: 5 });
}

function killEnemy(enemy, killer) {
  enemy.dead = true;
  addParticle(enemy.x, enemy.y, enemy.color, 12, 2, 0.6);
  if (killer && killer.id && players.has(killer.id)) {
    const leveled = giveExp(killer, enemy.exp);
    if (leveled) triggerLevelUp(killer);
  }
  if (enemy.isBoss) {
    boss = null;
    // Drop chest at boss location
    chests.push({ x: enemy.x, y: enemy.y, type: 'boss', timer: 60 });
  }
}

function triggerLevelUp(player) {
  const choices = generateLevelUpChoices(player);
  player.pendingLevelUp = true;
  player.levelUpChoices = choices;
  addParticle(player.x, player.y, '#f0c040', 20, 3, 1);
  network.sendTo(player.id, {
    type: 'levelup', level: player.level,
    choices: choices.map(c => ({ name: c.name, desc: c.desc }))
  });
}

function collectChest(player, chest) {
  const expAmount = chest.type === 'boss' ? 60 : 40;
  const leveled = giveExp(player, expAmount);
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.3);
  addParticle(chest.x, chest.y, '#f0c040', 15, 2, 0.6);
  addDamageNumber(chest.x, chest.y - 10, '+' + expAmount + ' EXP', '#f0c040');
  if (leveled) triggerLevelUp(player);
}
