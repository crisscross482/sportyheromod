// State
let balance = 1000.00;
let currentBet = 0;
let autoCashoutVal = 2.00;
let isBetActive = false;
let hasCashedOutThisRound = false;
let currentRoundId = 1;
let historyData = [];

// DOM elements
const roundNumberEl = document.getElementById('round-number');
const badgeStatusEl = document.getElementById('badge-status');
const multiplierOverlayEl = document.getElementById('multiplier-overlay');
const countdownOverlayEl = document.getElementById('countdown-overlay');
const balanceDisplayEl = document.getElementById('balance-display');
const btnResetBalance = document.getElementById('btn-reset-balance');
const inputBet = document.getElementById('input-bet');
const inputAutoCashout = document.getElementById('input-autocashout');
const btnBet = document.getElementById('btn-bet');
const btnCashout = document.getElementById('btn-cashout');
const betStatusMsg = document.getElementById('bet-status-msg');
const historyContainer = document.getElementById('history-container');

// Canvas setup & Visual FX engine
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let points = [];
let particles = [];
let stars = [];
let isCrashedState = false;
let animMultiplier = 1.00;
let targetMultiplier = 1.00;

function initStars() {
  stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 0.002 + 0.001
    });
  }
}
initStars();

function updateBalanceDisplay() {
  balanceDisplayEl.textContent = balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function addParticle(x, y, isExplosion = false) {
  const count = isExplosion ? 30 : 2;
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: isExplosion ? (Math.random() - 0.5) * 8 : -Math.random() * 2 - 1,
      vy: isExplosion ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 1.5,
      radius: isExplosion ? Math.random() * 4 + 2 : Math.random() * 3 + 1,
      alpha: 1.0,
      decay: isExplosion ? Math.random() * 0.02 + 0.015 : Math.random() * 0.04 + 0.03,
      color: isExplosion
        ? ['#ef4444', '#f97316', '#fbbf24'][Math.floor(Math.random() * 3)]
        : ['#38bdf8', '#818cf8', '#f59e0b'][Math.floor(Math.random() * 3)]
    });
  }
}

function drawHeroPlane(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Glow under hero
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 15;

  // Fuselage / Jet Body
  ctx.beginPath();
  ctx.moveTo(18 * window.devicePixelRatio, 0);
  ctx.lineTo(-14 * window.devicePixelRatio, -10 * window.devicePixelRatio);
  ctx.lineTo(-8 * window.devicePixelRatio, 0);
  ctx.lineTo(-14 * window.devicePixelRatio, 10 * window.devicePixelRatio);
  ctx.closePath();
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  // Wings / Accent
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-8 * window.devicePixelRatio, -16 * window.devicePixelRatio);
  ctx.lineTo(-12 * window.devicePixelRatio, -12 * window.devicePixelRatio);
  ctx.lineTo(-6 * window.devicePixelRatio, 0);
  ctx.lineTo(-12 * window.devicePixelRatio, 12 * window.devicePixelRatio);
  ctx.lineTo(-8 * window.devicePixelRatio, 16 * window.devicePixelRatio);
  ctx.closePath();
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // Jet thruster exhaust flame
  ctx.beginPath();
  ctx.moveTo(-10 * window.devicePixelRatio, -4 * window.devicePixelRatio);
  ctx.lineTo(-24 * window.devicePixelRatio, 0);
  ctx.lineTo(-10 * window.devicePixelRatio, 4 * window.devicePixelRatio);
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.fill();

  ctx.restore();
}

// Continuous Animation Loop
function renderFrame() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 1. Moving starry background
  ctx.fillStyle = '#ffffff';
  stars.forEach(s => {
    if (badgeStatusEl.textContent === 'Flying') {
      s.x -= s.speed;
      if (s.x < 0) s.x = 1.0;
    }
    ctx.globalAlpha = 0.35;
    ctx.fillRect(s.x * w, s.y * h, s.size * window.devicePixelRatio, s.size * window.devicePixelRatio);
  });
  ctx.globalAlpha = 1.0;

  // 2. Grid lines
  ctx.strokeStyle = 'rgba(30, 58, 138, 0.25)';
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 1; i <= gridLines; i++) {
    const y = (h / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 3. Smooth trajectory interpolation
  animMultiplier += (targetMultiplier - animMultiplier) * 0.15;

  if (points.length >= 2) {
    // Flight trail line
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }

    ctx.strokeStyle = isCrashedState ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 4 * window.devicePixelRatio;
    ctx.shadowColor = isCrashedState ? '#ef4444' : '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Fill underneath trail
    ctx.lineTo(points[points.length - 1].x * w, h);
    ctx.lineTo(points[0].x * w, h);
    ctx.closePath();
    ctx.fillStyle = isCrashedState ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.12)';
    ctx.shadowBlur = 0;
    ctx.fill();

    // Head position
    const tip = points[points.length - 1];
    const tipX = tip.x * w;
    const tipY = tip.y * h;

    if (!isCrashedState && badgeStatusEl.textContent === 'Flying') {
      addParticle(tipX - 10, tipY);
      // Angle based on last segment
      const prev = points[Math.max(0, points.length - 3)];
      const angle = Math.atan2((tip.y - prev.y) * h, (tip.x - prev.x) * w);
      drawHeroPlane(tipX, tipY, angle);
    }
  }

  // 4. Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  requestAnimationFrame(renderFrame);
}
requestAnimationFrame(renderFrame);

function addGraphPoint(multiplier) {
  const maxM = Math.max(2.2, multiplier * 1.15);
  const normalizedY = 1.0 - ((multiplier - 1.0) / (maxM - 1.0)) * 0.8;
  const x = Math.min(0.88, 0.06 + ((multiplier - 1.0) / (maxM - 1.0)) * 0.82);

  points.push({ x, y: Math.max(0.12, normalizedY) });
}

function renderHistory(rounds) {
  historyContainer.innerHTML = '';
  rounds.forEach((round) => {
    const chip = document.createElement('div');
    const m = round.crashMultiplier;
    let category = 'mid';
    if (m < 2.0) category = 'low';
    else if (m >= 5.0) category = 'high';

    chip.className = `chip ${category}`;
    chip.textContent = `${m.toFixed(2)}x`;
    chip.title = `Round #${round.roundId}\nHash: ${round.roundHash}\nClick to inspect`;

    chip.addEventListener('click', () => {
      document.getElementById('verify-server-seed').value = round.roundHash;
      document.getElementById('verify-client-seed').value = round.clientSeed;
      const idx = historyData.findIndex(r => r.roundId === round.roundId);
      if (idx > 0) {
        document.getElementById('verify-prev-hash').value = historyData[idx - 1].roundHash;
      } else {
        document.getElementById('verify-prev-hash').value = '';
      }
      document.getElementById('btn-verify').click();
    });

    historyContainer.appendChild(chip);
  });
}

// Connect to Server-Sent Events
function initEventSource() {
  const evtSource = new EventSource('/api/events');

  evtSource.onopen = () => {
    if (badgeStatusEl.textContent === 'Connecting...') {
      badgeStatusEl.className = 'badge badge-waiting';
      badgeStatusEl.textContent = 'Connected';
    }
  };

  evtSource.addEventListener('countdown', (e) => {
    const data = JSON.parse(e.data);
    isCrashedState = false;
    countdownOverlayEl.style.display = 'block';
    countdownOverlayEl.textContent = `Next round starts in ${data.countdown}s`;
    badgeStatusEl.className = 'badge badge-waiting';
    badgeStatusEl.textContent = 'Waiting';
    multiplierOverlayEl.classList.remove('crashed');
  });

  evtSource.addEventListener('round_start', (e) => {
    const data = JSON.parse(e.data);
    currentRoundId = data.roundId;
    roundNumberEl.textContent = currentRoundId;

    isCrashedState = false;
    animMultiplier = 1.00;
    targetMultiplier = 1.00;

    countdownOverlayEl.style.display = 'none';
    multiplierOverlayEl.classList.remove('crashed');
    multiplierOverlayEl.textContent = '1.00x';
    multiplierOverlayEl.style.color = '#fff';

    badgeStatusEl.className = 'badge badge-running';
    badgeStatusEl.textContent = 'Flying';

    points = [{ x: 0.06, y: 0.92 }];

    if (isBetActive) {
      btnBet.disabled = true;
      btnCashout.disabled = false;
      hasCashedOutThisRound = false;
      betStatusMsg.textContent = `Bet of ${currentBet.toFixed(2)} active!`;
      betStatusMsg.className = 'status-msg';
    }
  });

  evtSource.addEventListener('tick', (e) => {
    const data = JSON.parse(e.data);
    const m = data.currentMultiplier;
    targetMultiplier = m;

    if (badgeStatusEl.textContent !== 'Flying') {
      badgeStatusEl.className = 'badge badge-running';
      badgeStatusEl.textContent = 'Flying';
      countdownOverlayEl.style.display = 'none';
      if (isBetActive && !hasCashedOutThisRound) {
        btnCashout.disabled = false;
      }
    }
    multiplierOverlayEl.textContent = `${m.toFixed(2)}x`;
    addGraphPoint(m);

    // Auto-cashout
    if (isBetActive && !hasCashedOutThisRound) {
      if (autoCashoutVal > 1.0 && m >= autoCashoutVal) {
        cashOut(autoCashoutVal);
      }
    }
  });

  evtSource.addEventListener('crash', (e) => {
    const data = JSON.parse(e.data);
    targetMultiplier = data.crashMultiplier;
    multiplierOverlayEl.textContent = `${data.crashMultiplier.toFixed(2)}x`;
    multiplierOverlayEl.classList.add('crashed');

    badgeStatusEl.className = 'badge badge-crashed';
    badgeStatusEl.textContent = 'Crashed';

    isCrashedState = true;
    if (points.length > 0) {
      const tip = points[points.length - 1];
      addParticle(tip.x * canvas.width, tip.y * canvas.height, true);
    }

    if (isBetActive && !hasCashedOutThisRound) {
      betStatusMsg.textContent = `Crashed at ${data.crashMultiplier.toFixed(2)}x. You lost ${currentBet.toFixed(2)} credits.`;
      betStatusMsg.className = 'status-msg lose';
      isBetActive = false;
    }

    btnBet.disabled = false;
    btnCashout.disabled = true;

    historyData.unshift(data);
    if (historyData.length > 50) historyData.pop();
    renderHistory(historyData);
  });

  evtSource.onerror = () => {
    badgeStatusEl.textContent = 'Disconnected';
  };
}

function cashOut(targetMultiplier = null) {
  if (!isBetActive || hasCashedOutThisRound) return;

  const currentDisplayM = targetMultiplier || parseFloat(multiplierOverlayEl.textContent) || 1.0;
  const payout = currentBet * currentDisplayM;
  balance += payout;
  updateBalanceDisplay();

  hasCashedOutThisRound = true;
  isBetActive = false;
  btnCashout.disabled = true;
  btnBet.disabled = false;

  betStatusMsg.textContent = `Cashed out at ${currentDisplayM.toFixed(2)}x! Won +${payout.toFixed(2)} credits.`;
  betStatusMsg.className = 'status-msg win';
}

// User Actions
btnBet.addEventListener('click', () => {
  const betVal = parseFloat(inputBet.value);
  if (isNaN(betVal) || betVal <= 0 || betVal > balance) {
    alert('Please enter a valid bet within your balance.');
    return;
  }
  autoCashoutVal = parseFloat(inputAutoCashout.value) || 0;

  balance -= betVal;
  currentBet = betVal;
  updateBalanceDisplay();

  isBetActive = true;
  hasCashedOutThisRound = false;
  btnBet.disabled = true;
  betStatusMsg.textContent = `Bet queued for next round (${betVal.toFixed(2)} credits).`;
  betStatusMsg.className = 'status-msg';

  if (badgeStatusEl.textContent === 'Flying') {
    btnCashout.disabled = false;
  }
});

btnCashout.addEventListener('click', () => {
  cashOut();
});

btnResetBalance.addEventListener('click', () => {
  balance = 1000.00;
  updateBalanceDisplay();
});

// Provably Fair Verifier Form
document.getElementById('verify-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const serverSeed = document.getElementById('verify-server-seed').value.trim();
  const clientSeed = document.getElementById('verify-client-seed').value.trim();
  const prevHash = document.getElementById('verify-prev-hash').value.trim();

  if (!serverSeed) return;

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverSeed, clientSeed, previousHash: prevHash || null })
    });
    const result = await res.json();

    document.getElementById('verify-result').style.display = 'block';
    document.getElementById('res-multiplier').textContent = `${result.calculatedMultiplier.toFixed(2)}x`;

    if (result.hashChainValid === true) {
      document.getElementById('res-chain-check').textContent = '✅ Valid (SHA256(ServerSeed) matches parent hash)';
      document.getElementById('res-chain-check').style.color = 'var(--success)';
    } else if (result.hashChainValid === false) {
      document.getElementById('res-chain-check').textContent = '❌ Invalid Chain Link (Hash does not match parent)';
      document.getElementById('res-chain-check').style.color = 'var(--danger)';
    } else {
      document.getElementById('res-chain-check').textContent = 'Not tested (No parent hash provided)';
      document.getElementById('res-chain-check').style.color = 'var(--text-muted)';
    }
  } catch (err) {
    alert('Verification request failed: ' + err.message);
  }
});

// Initial data load
fetch('/api/state')
  .then(res => res.json())
  .then(state => {
    roundNumberEl.textContent = state.roundId;
    historyData = state.history || [];
    renderHistory(historyData);
    initEventSource();
  })
  .catch(() => {
    initEventSource();
  });
