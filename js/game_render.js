/* ========================================
   ARENA DUNGEON — Enemies, Chests, Events, Render
   ======================================== */

// ========================================
// ENEMY UPDATES
// ========================================
function updateAllEnemies(dt) {
  const bloodMoon = currentEvent === 'Blood Moon';
  const pArr = [...players.values()];
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) { enemies.splice(i, 1); continue; }
    if (e.poisoned) { e.hp -= e.poisonDmg * dt; if (e.hp <= 0) { killEnemy(e, null); continue; } }
    const result = updateEnemy(e, pArr, dt, GAME_MAP);
    if (result && result.type === 'attack') {
      let dmg = result.damage;
      if (bloodMoon) dmg = Math.floor(dmg * 1.5);
      dealDamageToEntity(result.target, dmg, e);
    }
  }
  if (boss && !boss.dead) {
    if (boss.poisoned) { boss.hp -= boss.poisonDmg * dt; if (boss.hp <= 0) { killEnemy(boss, null); return; } }
    const result = updateEnemy(boss, pArr, dt, GAME_MAP);
    if (result) {
      if (result.type === 'attack') dealDamageToEntity(result.target, result.damage, boss);
      if (result.type === 'boss_aoe') {
        for (const [, p] of players) {
          if (p.dead) continue;
          const d = Math.sqrt((p.x - result.x) ** 2 + (p.y - result.y) ** 2);
          if (d < result.radius) dealDamageToEntity(p, result.damage, boss);
        }
        addParticle(boss.x, boss.y, '#ff4400', 25, 4, 0.8);
      }
    }
  }
  // Enemy spawning
  enemySpawnTimer -= dt;
  const surge = currentEvent === 'Monster Surge';
  if (enemySpawnTimer <= 0) {
    enemySpawnTimer = surge ? 2 : 4;
    if (enemies.length < 20 + players.size * 4) spawnEnemy();
  }
}

function spawnEnemy() {
  const types = ['goblin', 'goblin', 'goblin', 'skeleton', 'skeleton', 'brute'];
  const type = types[Math.floor(Math.random() * types.length)];
  const tile = getRandomFloorTile(GAME_MAP);
  enemies.push(createEnemy(type, tile.x, tile.y));
}

// ========================================
// PROJECTILE UPDATES
// ========================================
function updateAllProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.distTraveled += Math.sqrt((p.vx * dt * 60) ** 2 + (p.vy * dt * 60) ** 2);

    // Wall hit
    if (isWall(p.x, p.y, 2, GAME_MAP) || p.distTraveled > p.maxRange) {
      if (p.aoe) aoeExplosion(p);
      projectiles.splice(i, 1);
      continue;
    }
    // Hit enemies
    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
      if (d < e.radius + p.radius) {
        const owner = players.get(p.ownerId);
        dealDamageToEntity(e, p.damage, owner);
        hit = true; break;
      }
    }
    if (!hit && boss && !boss.dead) {
      const d = Math.sqrt((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2);
      if (d < boss.radius + p.radius) {
        dealDamageToEntity(boss, p.damage, players.get(p.ownerId));
        hit = true;
      }
    }
    // Hit other players (PvP)
    if (!hit) {
      for (const [id, pl] of players) {
        if (pl.dead || id === p.ownerId || pl.invisible) continue;
        const d = Math.sqrt((pl.x - p.x) ** 2 + (pl.y - p.y) ** 2);
        if (d < pl.radius + p.radius) {
          dealDamageToEntity(pl, p.damage, players.get(p.ownerId));
          hit = true; break;
        }
      }
    }
    if (hit) {
      if (p.aoe) aoeExplosion(p);
      projectiles.splice(i, 1);
    }
  }
}

function aoeExplosion(proj) {
  addParticle(proj.x, proj.y, proj.color, 15, 3, 0.6);
  const targets = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const d = Math.sqrt((e.x - proj.x) ** 2 + (e.y - proj.y) ** 2);
    if (d < proj.aoeRadius) targets.push(e);
  }
  for (const [id, pl] of players) {
    if (pl.dead || id === proj.ownerId) continue;
    const d = Math.sqrt((pl.x - proj.x) ** 2 + (pl.y - proj.y) ** 2);
    if (d < proj.aoeRadius) targets.push(pl);
  }
  const owner = players.get(proj.ownerId);
  for (const t of targets) dealDamageToEntity(t, Math.floor(proj.damage * 0.6), owner);
}

// ========================================
// TRAPS
// ========================================
function updateTraps(dt) {
  for (let i = traps.length - 1; i >= 0; i--) {
    const t = traps[i];
    t.life -= dt;
    if (t.life <= 0) { traps.splice(i, 1); continue; }
    // Check for enemy/player stepping on it
    const allTargets = [...enemies];
    for (const [id, p] of players) { if (id !== t.ownerId) allTargets.push(p); }
    if (boss && !boss.dead) allTargets.push(boss);
    for (const target of allTargets) {
      if (target.dead) continue;
      const d = Math.sqrt((target.x - t.x) ** 2 + (target.y - t.y) ** 2);
      if (d < t.radius) {
        dealDamageToEntity(target, t.damage, players.get(t.ownerId));
        addParticle(t.x, t.y, '#ffaa00', 15, 3, 0.6);
        traps.splice(i, 1);
        break;
      }
    }
  }
}

// ========================================
// CHESTS & BOSSES & EVENTS
// ========================================
function updateChestSpawns(dt) {
  nextChestTime -= dt;
  if (currentEvent === 'Treasure Rain' && nextChestTime > 5) nextChestTime = 0.5;
  if (nextChestTime <= 0) {
    nextChestTime = 25;
    const tile = getRandomFloorTile(GAME_MAP);
    chests.push({ x: tile.x * 32 + 16, y: tile.y * 32 + 16, type: 'normal', timer: 60 });
    addParticle(tile.x * 32 + 16, tile.y * 32 + 16, '#f0c040', 8, 2, 0.5);
  }
  // Remove expired chests
  for (let i = chests.length - 1; i >= 0; i--) {
    chests[i].timer -= dt;
    if (chests[i].timer <= 0) chests.splice(i, 1);
  }
}

function updateBossSpawn(dt) {
  if (boss && !boss.dead) return;
  nextBossTime -= dt;
  if (nextBossTime <= 0) {
    nextBossTime = 120;
    boss = createBoss(players.size);
    addParticle(boss.x, boss.y, '#ff2200', 30, 4, 1);
  }
}

function updateEventSystem(dt) {
  if (currentEvent) {
    eventTimer -= dt;
    if (eventTimer <= 0) { currentEvent = null; }
    return;
  }
  nextEventTime -= dt;
  if (nextEventTime <= 0) {
    nextEventTime = 50 + Math.random() * 30;
    const events = ['Dark Fog', 'Monster Surge', 'Treasure Rain', 'Blood Moon'];
    currentEvent = events[Math.floor(Math.random() * events.length)];
    eventTimer = 30;
    if (currentEvent === 'Treasure Rain') {
      for (let i = 0; i < 5; i++) {
        const t = getRandomFloorTile(GAME_MAP);
        chests.push({ x: t.x * 32 + 16, y: t.y * 32 + 16, type: 'normal', timer: 45 });
      }
    }
  }
}

// ========================================
// BROADCAST STATE TO CONTROLLERS
// ========================================
let broadcastTimer = 0;
function broadcastState() {
  broadcastTimer += 1;
  if (broadcastTimer < 3) return; // ~every 3 frames
  broadcastTimer = 0;
  for (const [id, p] of players) {
    network.sendTo(id, {
      type: 'state',
      hp: Math.floor(p.hp), maxHp: p.maxHp,
      level: p.level, exp: p.exp, expToNext: p.expToNext,
      dead: p.dead, respawnTimer: Math.ceil(p.respawnTimer),
      cd: p.abilities.map(a => Math.max(0, a.currentCd).toFixed(1)),
      kills: p.kills
    });
  }
}

// ========================================
// END MATCH
// ========================================
function endMatch() {
  gamePhase = 'ended';
  const sorted = [...players.values()].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.kills - a.kills;
  });
  const winner = sorted[0];
  document.getElementById('game-over').className = 'active';
  document.getElementById('winner-name').textContent =
    winner ? ('🏆 ' + winner.name + ' — Lv.' + winner.level) : 'No winner';
  const lb = document.getElementById('final-leaderboard');
  lb.innerHTML = '';
  sorted.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'final-entry';
    div.innerHTML = '<span style="color:' + p.color + '">#' + (i + 1) + ' ' + p.name + '</span>' +
      '<span>Lv.' + p.level + ' | ' + p.kills + ' kills</span>';
    lb.appendChild(div);
  });
  network.broadcast({
    type: 'gameover',
    winner: winner ? winner.name : 'None',
    leaderboard: sorted.map(p => ({ name: p.name, level: p.level, kills: p.kills }))
  });
}

// ========================================
// RENDER
// ========================================
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  renderMap();
  renderChests();
  renderTraps();
  renderEnemyEntities();
  renderBossEntity();
  renderPlayerEntities();
  renderProjectileEntities();
  renderParticles(ctx);
  renderDamageNumbers(ctx);

  if (typeof gameMode !== 'undefined' && gameMode === 'dungeon') {
    renderDungeonLighting();
  }

  // Dark Fog event (applies to both modes if the event triggers)
  if (currentEvent === 'Dark Fog') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const [, p] of players) {
      if (p.dead) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 80);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - 80, p.y - 80, 160, 160);
      ctx.restore();
    }
  }

  // Blood Moon tint
  if (currentEvent === 'Blood Moon') {
    ctx.fillStyle = 'rgba(100,0,0,0.15)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // HUD
  renderMatchTimer(ctx, matchTimer, CANVAS_W);
  renderLeaderboard(ctx, [...players.values()], CANVAS_W);
  if (currentEvent) renderEventBanner(ctx, currentEvent, CANVAS_W);
}

function isVisibleInDungeon(x, y) {
  if (typeof gameMode !== 'undefined' && gameMode === 'dungeon' && visibilityMap) {
    const r = Math.floor(y / TILE);
    const c = Math.floor(x / TILE);
    if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
      return visibilityMap[r][c] > 0; // Discovered or currently visible
    }
    return false;
  }
  return true; // Not dungeon mode, so always visible
}

function renderDungeonLighting() {
  ctx.save();
  // Draw darkness overlay
  ctx.fillStyle = 'rgba(0,0,0,0.92)'; // nearly pitch black
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Cut out light holes for each player using destination-out
  ctx.globalCompositeOperation = 'destination-out';
  for (const [, p] of players) {
    if (p.dead) continue;
    // Base radius + based on torch level
    const lightRadius = 60 + Math.floor((p.torchLevel / 100) * 120);
    const grad = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, lightRadius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Slight flicker effect inner
    if (Math.random() < 0.2) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.random() * 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function renderMap() {
  const isDungeon = typeof gameMode !== 'undefined' && gameMode === 'dungeon';

  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const x = c * TILE, y = r * TILE;
      
      let vis = 2; // Default to visible
      if (isDungeon && visibilityMap) {
        vis = visibilityMap[r][c];
      }

      // If completely unknown, draw pure black and skip tile logic
      if (vis === 0) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, TILE, TILE);
        continue;
      }

      if (GAME_MAP[r][c] === 1) {
        if (ASSETS.wallTile.complete && ASSETS.wallTile.naturalWidth) {
          ctx.drawImage(ASSETS.wallTile, x, y, TILE, TILE);
        } else {
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(x, y, TILE, TILE);
          // Stone texture
          ctx.fillStyle = '#4a3a2a';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(x + 2, y + TILE / 2, TILE - 4, 1);
          ctx.fillRect(x + TILE / 2, y + 2, 1, TILE - 4);
        }
      } else {
        if (ASSETS.floorTile.complete && ASSETS.floorTile.naturalWidth) {
          ctx.drawImage(ASSETS.floorTile, x, y, TILE, TILE);
        } else {
          ctx.fillStyle = '#1e1612';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#241a16';
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        }
      }

      // Draw explored but not visible dark overlay
      if (vis === 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; // Makes it apparent it's explored but out of sight
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}

function renderChests() {
  for (const c of chests) {
    if (!isVisibleInDungeon(c.x, c.y)) continue;
    if (ASSETS.chest.complete && ASSETS.chest.naturalWidth) {
      // Draw 32x32 image centered at c.x, c.y
      ctx.drawImage(ASSETS.chest, c.x - 16, c.y - 16, 32, 32);
    } else {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(c.x - 8, c.y - 6, 16, 12);
      ctx.fillStyle = '#D4A017';
      ctx.fillRect(c.x - 7, c.y - 5, 14, 10);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(c.x - 2, c.y - 2, 4, 4);
    }
  }
}

function renderTraps() {
  for (const t of traps) {
    if (!isVisibleInDungeon(t.x, t.y)) continue;
    if (ASSETS.trap.complete && ASSETS.trap.naturalWidth) {
      // Draw 32x32 image centered at t.x, t.y
      ctx.drawImage(ASSETS.trap, t.x - 16, t.y - 16, 32, 32);
    } else {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,170,0,0.4)';
      ctx.fill();
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function renderEnemyEntities() {
  for (const e of enemies) {
    if (e.dead) continue;
    if (!isVisibleInDungeon(e.x, e.y)) continue;

    if (ASSETS[e.type] && ASSETS[e.type].complete && ASSETS[e.type].naturalWidth) {
      let imgSize = e.type === 'brute' ? 40 : 32;
      ctx.save();
      ctx.translate(e.x, e.y);
      const angle = Math.atan2(e.facingY || 0, e.facingX || 0);
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(ASSETS[e.type], -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      ctx.restore();

      if (e.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    drawHealthBar(ctx, e.x, e.y - e.radius - 8, e.radius * 2, 3, e.hp, e.maxHp, e.color);
  }
}

function renderBossEntity() {
  if (!boss || boss.dead) return;
  if (!isVisibleInDungeon(boss.x, boss.y)) return;
  
  // AoE warning
  if (boss.aoeWarning > 0) {
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, 80, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,50,0,' + (boss.aoeWarning * 0.3) + ')';
    ctx.fill();
  }

  if (ASSETS.boss && ASSETS.boss.complete && ASSETS.boss.naturalWidth) {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    const angle = Math.atan2(boss.facingY || 0, boss.facingX || 0);
    ctx.rotate(angle + Math.PI / 2);
    ctx.drawImage(ASSETS.boss, -32, -32, 64, 64);
    ctx.restore();

    if (boss.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = boss.hitFlash > 0 ? '#fff' : boss.color;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawHealthBar(ctx, boss.x, boss.y - boss.radius - 12, 50, 5, boss.hp, boss.maxHp, '#ff2200');
  drawNameLabel(ctx, boss.x, boss.y - boss.radius - 16, boss.name, '#ff4444');
}

function renderPlayerEntities() {
  for (const [, p] of players) {
    if (p.dead) continue;
    const alpha = p.invisible ? 0.25 : 1;
    ctx.globalAlpha = alpha;
    // Shield effect
    if (p.shieldBlock) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Player body
    if (ASSETS[p.className] && ASSETS[p.className].complete && ASSETS[p.className].naturalWidth) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.facingY || 0, p.facingX || 0);
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(ASSETS[p.className], -16, -16, 32, 32);
      ctx.restore();

      if (p.invincible) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = p.invincible ? '#fff' : p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing direction indicator
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x + p.facingX * 7, p.y + p.facingY * 7, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    drawHealthBar(ctx, p.x, p.y - p.radius - 10, 26, 4, p.hp, p.maxHp, p.color);
    drawNameLabel(ctx, p.x, p.y - p.radius - 14, p.name + ' Lv' + p.level, p.color);
  }
}

function renderProjectileEntities() {
  for (const p of projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
