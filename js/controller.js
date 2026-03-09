/* ========================================
   ARENA DUNGEON — Mobile Controller
   ======================================== */

let ctrlNetwork = null;
let selectedClass = null;
let joined = false;
let gameStarted = false;
let joystickActive = false;
let joystickBaseX = 0, joystickBaseY = 0;
let joystickX = 0, joystickY = 0;
let joystickTouchId = null;
const JOYSTICK_MAX = 50;

// Input sending rate
let inputInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (!room) {
    document.getElementById('ctrl-join').innerHTML =
      '<h1>Error</h1><p style="color:#887766">No room code. Scan the QR code on the host screen.</p>';
    return;
  }

  // Class selection
  document.querySelectorAll('.class-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedClass = btn.dataset.class;
      updateJoinButton();
    });
  });

  // Name input
  document.getElementById('player-name').addEventListener('input', updateJoinButton);

  // Join button
  document.getElementById('join-btn').addEventListener('click', () => joinGame(room));

  // Ability buttons
  document.querySelectorAll('.ability-btn').forEach((btn, i) => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      ctrlNetwork.send({ type: 'input', mx: joystickX, my: joystickY, ['a' + (i + 1)]: true });
    });
  });

  // Joystick
  const zone = document.getElementById('joystick-zone');
  zone.addEventListener('touchstart', onJoystickStart, { passive: false });
  zone.addEventListener('touchmove', onJoystickMove, { passive: false });
  zone.addEventListener('touchend', onJoystickEnd, { passive: false });
  zone.addEventListener('touchcancel', onJoystickEnd, { passive: false });

  // Dungeon Buttons
  const interactBtn = document.getElementById('interact-btn');
  if (interactBtn) {
    interactBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      ctrlNetwork.send({ type: 'interact' });
    });
  }

  document.querySelectorAll('.inv-slot').forEach(slot => {
    slot.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameStarted) return;
      const slotIndex = parseInt(slot.dataset.slot);
      ctrlNetwork.send({ type: 'use_item', slot: slotIndex });
    });
  });
});

let lastShakeTime = 0;
let lastX = null, lastY = null, lastZ = null;

function startShakeDetection() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then(permissionState => {
      if (permissionState === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
      }
    }).catch(console.error);
  } else {
    // Non-iOS 13+ devices
    window.addEventListener('devicemotion', handleMotion);
  }
}

function handleMotion(event) {
  if (!gameStarted || !ctrlNetwork) return;
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;

  if (lastX !== null) {
    const deltaX = Math.abs(lastX - acc.x);
    const deltaY = Math.abs(lastY - acc.y);
    const deltaZ = Math.abs(lastZ - acc.z);

    if (deltaX + deltaY + deltaZ > 25) { // Shake threshold
      const now = Date.now();
      if (now - lastShakeTime > 1000) { // Limit to 1 shake per sec
        lastShakeTime = now;
        ctrlNetwork.send({ type: 'shake' });
      }
    }
  }
  lastX = acc.x; lastY = acc.y; lastZ = acc.z;
}

function updateJoinButton() {
  const name = document.getElementById('player-name').value.trim();
  const btn = document.getElementById('join-btn');
  btn.className = (name.length > 0 && selectedClass) ? 'visible' : '';
}

async function joinGame(room) {
  if (joined) return;
  const name = document.getElementById('player-name').value.trim();
  if (!name || !selectedClass) return;

  document.getElementById('join-btn').textContent = 'Connecting...';
  ctrlNetwork = new ControllerNetwork(room);

  ctrlNetwork.onMessage = handleHostMessage;
  ctrlNetwork.onDisconnect = () => {
    document.getElementById('ctrl-gameover').className = 'active';
    document.querySelector('#ctrl-gameover h1').textContent = 'Disconnected';
    gameStarted = false;
  };

  try {
    await ctrlNetwork.init();
    joined = true;
    ctrlNetwork.send({ type: 'join', name: name, className: selectedClass });

    // Update ability icons based on class
    const cd = CLASS_DATA[selectedClass];
    document.querySelectorAll('.ability-btn').forEach((btn, i) => {
      btn.querySelector('.ability-icon').textContent = cd.abilities[i].icon;
      btn.querySelector('.ability-label').textContent = cd.abilities[i].name;
    });

    // Show waiting screen
    document.getElementById('ctrl-join').style.display = 'none';
    document.getElementById('ctrl-waiting').className = 'active';

    // Start input loop
    inputInterval = setInterval(sendInput, 50);
  } catch (e) {
    document.getElementById('join-btn').textContent = 'Failed — Retry';
    joined = false;
    console.error(e);
  }
}

function handleHostMessage(data) {
  if (!data || !data.type) return;

  switch (data.type) {
    case 'joined':
      break;
    case 'start':
      gameStarted = true;
      document.body.className = 'mode-' + data.mode;
      document.getElementById('ctrl-waiting').className = '';
      document.getElementById('ctrl-game').className = 'active';

      if (data.mode === 'dungeon') {
        startShakeDetection();
      }
      break;
    case 'state':
      updateControllerHUD(data);
      break;
    case 'died':
      document.getElementById('ctrl-dead').className = 'active';
      break;
    case 'levelup':
      showLevelUpUI(data);
      break;
    case 'upgrade_done':
      document.getElementById('ctrl-levelup').className = '';
      break;
    case 'gameover':
      gameStarted = false;
      showGameOver(data);
      break;
  }
}

function updateControllerHUD(data) {
  // Check if respawned
  if (!data.dead) {
    document.getElementById('ctrl-dead').className = '';
  }

  const hpPct = Math.max(0, (data.hp / data.maxHp) * 100);
  document.getElementById('ctrl-hp-fill').style.width = hpPct + '%';
  document.getElementById('ctrl-hp-text').textContent = data.hp + '/' + data.maxHp;
  document.getElementById('ctrl-level').textContent = 'Lv.' + data.level;

  const expPct = data.expToNext > 0 ? (data.exp / data.expToNext) * 100 : 0;
  document.getElementById('ctrl-exp-fill').style.width = expPct + '%';

  if (data.mode === 'dungeon' || document.body.classList.contains('mode-dungeon')) {
    const alert = document.getElementById('ctrl-torch-alert');
    if (data.torchLevel < 20) {
      alert.classList.add('visible');
    } else {
      alert.classList.remove('visible');
    }

    // Update inventory slots if data.inventory exists
    if (data.inventory) {
       for(let i=1; i<=4; i++) {
         const countEl = document.querySelector('#inv-slot-' + i + ' .inv-count');
         if (countEl) {
           const count = data.inventory[i-1] || 0;
           countEl.textContent = count;
           countEl.className = count > 0 ? 'inv-count' : 'inv-count empty';
         }
       }
    }
  }

  // Cooldowns
  document.querySelectorAll('.ability-btn').forEach((btn, i) => {
    const cd = parseFloat(data.cd[i]);
    const overlay = btn.querySelector('.cd-overlay');
    if (cd > 0) {
      btn.classList.add('on-cooldown');
      overlay.textContent = cd.toFixed(0);
    } else {
      btn.classList.remove('on-cooldown');
      overlay.textContent = '';
    }
  });
}

function showLevelUpUI(data) {
  document.getElementById('ctrl-levelup').className = 'active';
  const container = document.getElementById('upgrade-choices');
  container.innerHTML = '';
  data.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.innerHTML = '<div class="upgrade-name">' + c.name + '</div><div class="upgrade-desc">' + c.desc + '</div>';
    btn.addEventListener('click', () => {
      ctrlNetwork.send({ type: 'upgrade', index: i });
    });
    container.appendChild(btn);
  });
}

function showGameOver(data) {
  document.getElementById('ctrl-dead').className = '';
  document.getElementById('ctrl-levelup').className = '';
  document.getElementById('ctrl-gameover').className = 'active';
  document.querySelector('#ctrl-gameover h1').textContent = 'Game Over';
  document.querySelector('#ctrl-gameover .result').textContent =
    '🏆 Winner: ' + data.winner;
}

// ========================================
// JOYSTICK
// ========================================
function onJoystickStart(e) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  joystickTouchId = touch.identifier;
  const zone = document.getElementById('joystick-zone');
  const rect = zone.getBoundingClientRect();
  joystickBaseX = touch.clientX - rect.left;
  joystickBaseY = touch.clientY - rect.top;
  joystickActive = true;

  // Move the base visual
  const base = document.getElementById('joystick-base');
  base.style.left = joystickBaseX + 'px';
  base.style.bottom = 'auto';
  base.style.top = joystickBaseY + 'px';
  base.style.transform = 'translate(-50%, -50%)';
}

function onJoystickMove(e) {
  e.preventDefault();
  if (!joystickActive) return;
  for (const touch of e.changedTouches) {
    if (touch.identifier !== joystickTouchId) continue;
    const zone = document.getElementById('joystick-zone');
    const rect = zone.getBoundingClientRect();
    let dx = (touch.clientX - rect.left) - joystickBaseX;
    let dy = (touch.clientY - rect.top) - joystickBaseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > JOYSTICK_MAX) {
      dx = (dx / dist) * JOYSTICK_MAX;
      dy = (dy / dist) * JOYSTICK_MAX;
    }
    joystickX = dx / JOYSTICK_MAX;
    joystickY = dy / JOYSTICK_MAX;

    const stick = document.getElementById('joystick-stick');
    stick.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  }
}

function onJoystickEnd(e) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier !== joystickTouchId) continue;
    joystickActive = false;
    joystickX = 0;
    joystickY = 0;
    joystickTouchId = null;
    const stick = document.getElementById('joystick-stick');
    stick.style.transform = 'translate(-50%, -50%)';
    const base = document.getElementById('joystick-base');
    base.style.left = '50%';
    base.style.bottom = '30%';
    base.style.top = 'auto';
    base.style.transform = 'translate(-50%, 50%)';
  }
}

function sendInput() {
  if (!gameStarted || !ctrlNetwork || !ctrlNetwork.connected) return;
  ctrlNetwork.send({
    type: 'input',
    mx: Math.round(joystickX * 100) / 100,
    my: Math.round(joystickY * 100) / 100
  });
}
