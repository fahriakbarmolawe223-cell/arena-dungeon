/* ========================================
   ARENA DUNGEON — UI Rendering Helpers
   ======================================== */

// Particle & damage number systems

const particles = [];
const damageNumbers = [];

/**
 * Add a particle effect.
 */
function addParticle(x, y, color, count, speed, life) {
  for (let i = 0; i < (count || 5); i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (speed || 2) * (0.5 + Math.random());
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      color: color || '#ffaa00',
      life: (life || 0.6) * (0.5 + Math.random() * 0.5),
      maxLife: life || 0.6,
      size: 2 + Math.random() * 3
    });
  }
}

/**
 * Add a damage number popup.
 */
function addDamageNumber(x, y, value, color) {
  damageNumbers.push({
    x: x + (Math.random() - 0.5) * 16,
    y: y - 10,
    value: value,
    color: color || '#fff',
    life: 1.0,
    vy: -1.5
  });
}

/**
 * Update all particles.
 */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/**
 * Update all damage numbers.
 */
function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const d = damageNumbers[i];
    d.y += d.vy * dt * 60;
    d.life -= dt * 1.5;
    if (d.life <= 0) damageNumbers.splice(i, 1);
  }
}

/**
 * Render particles on canvas.
 */
function renderParticles(ctx) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/**
 * Render damage numbers on canvas.
 */
function renderDamageNumbers(ctx) {
  ctx.textAlign = 'center';
  for (const d of damageNumbers) {
    const alpha = Math.max(0, d.life);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = d.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(d.value, d.x, d.y);
    ctx.fillText(d.value, d.x, d.y);
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw a health bar above an entity.
 */
function drawHealthBar(ctx, x, y, w, h, hp, maxHp, color) {
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = pct > 0.5 ? (color || '#40cc40') : pct > 0.25 ? '#cccc40' : '#cc4040';
  ctx.fillRect(x - w / 2, y, w * pct, h);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y, w, h);
}

/**
 * Draw a name label above entity.
 */
function drawNameLabel(ctx, x, y, name, color) {
  ctx.textAlign = 'center';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillText(name, x + 1, y + 1);
  ctx.fillStyle = color || '#fff';
  ctx.fillText(name, x, y);
}

/**
 * Render the match timer.
 */
function renderMatchTimer(ctx, timeLeft, canvasW) {
  const min = Math.floor(timeLeft / 60);
  const sec = Math.floor(timeLeft % 60);
  const timeStr = min + ':' + (sec < 10 ? '0' : '') + sec;

  ctx.textAlign = 'center';
  ctx.font = '28px MedievalSharp, cursive';
  ctx.fillStyle = '#000';
  ctx.fillText(timeStr, canvasW / 2 + 1, 32 + 1);
  ctx.fillStyle = timeLeft < 30 ? '#ff4040' : '#f0c040';
  ctx.fillText(timeStr, canvasW / 2, 32);
}

/**
 * Render the leaderboard.
 */
function renderLeaderboard(ctx, players, canvasW) {
  const sorted = [...players].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.kills - a.kills;
  });

  const x = canvasW - 170;
  const y = 8;
  const w = 162;
  const h = 18 + sorted.length * 18;

  ctx.fillStyle = 'rgba(20, 15, 10, 0.85)';
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6, true, true);

  ctx.textAlign = 'left';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('LEADERBOARD', x + 8, y + 14);

  ctx.font = '11px Inter, sans-serif';
  sorted.forEach((p, i) => {
    const py = y + 28 + i * 18;
    ctx.fillStyle = p.dead ? '#666' : p.color;
    ctx.fillText(p.name, x + 8, py);
    ctx.fillStyle = '#f0c040';
    ctx.textAlign = 'right';
    ctx.fillText('Lv.' + p.level + '  K:' + p.kills, x + w - 8, py);
    ctx.textAlign = 'left';
  });
}

/**
 * Draw rounded rectangle helper.
 */
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Draw event banner on canvas.
 */
function renderEventBanner(ctx, eventName, canvasW) {
  if (!eventName) return;
  ctx.textAlign = 'center';
  ctx.font = '22px MedievalSharp, cursive';
  ctx.fillStyle = '#000';
  ctx.fillText('⚠ ' + eventName + ' ⚠', canvasW / 2 + 1, 58 + 1);
  ctx.fillStyle = '#ff6040';
  ctx.fillText('⚠ ' + eventName + ' ⚠', canvasW / 2, 58);
}
