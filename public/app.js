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

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let points = [];

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

function drawGraph(multiplier, crashed = false) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  const gridCount = 5;
  for (let i = 1; i <= gridCount; i++) {
    const y = (h / gridCount) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (points.length < 2) return;

  // Draw curve
  ctx.beginPath();
  ctx.moveTo(points[0].x * w, points[0].y * h);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * w, points[i].y * h);
  }

  ctx.strokeStyle = crashed ? '#ef4444' : '#3b82f6';
  ctx.lineWidth = 4 * window.devicePixelRatio;
  ctx.stroke();

  // Area under curve
  ctx.lineTo(points[points.length - 1].x * w, h);
  ctx.lineTo(points[0].x * w, h);
  ctx.closePath();
  ctx.fillStyle = crashed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)';
  ctx.fill();

  // Rocket or dot at the tip
  const lastPoint = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(lastPoint.x * w, lastPoint.y * h, 7 * window.devicePixelRatio, 0, Math.PI * 2);
  ctx.fillStyle = crashed ? '#ef4444' : '#60a5fa';
  ctx.fill();
}

function addGraphPoint(multiplier) {
  // Map multiplier to canvas coordinate
  const maxM = Math.max(2.0, multiplier * 1.1);
  const normalizedY = 1.0 - ((multiplier - 1.0) / (maxM - 1.0)) * 0.85;
  const x = Math.min(0.9, 0.05 + ((multiplier - 1.0) / (maxM - 1.0)) * 0.85);

  points.push({ x, y: Math.max(0.1, normalizedY) });
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
      // Find parent hash in history if available
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

    countdownOverlayEl.style.display = 'none';
    multiplierOverlayEl.classList.remove('crashed');
    multiplierOverlayEl.textContent = '1.00x';
    multiplierOverlayEl.style.color = '#fff';

    badgeStatusEl.className = 'badge badge-running';
    badgeStatusEl.textContent = 'Flying';

    points = [{ x: 0.05, y: 0.95 }];
    drawGraph(1.00, false);

    // If player bet placed before round started
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
    drawGraph(m, false);

    // Handle auto-cashout
    if (isBetActive && !hasCashedOutThisRound) {
      if (autoCashoutVal > 1.0 && m >= autoCashoutVal) {
        cashOut(autoCashoutVal);
      }
    }
  });

  evtSource.addEventListener('crash', (e) => {
    const data = JSON.parse(e.data);
    multiplierOverlayEl.textContent = `${data.crashMultiplier.toFixed(2)}x`;
    multiplierOverlayEl.classList.add('crashed');

    badgeStatusEl.className = 'badge badge-crashed';
    badgeStatusEl.textContent = 'Crashed';

    drawGraph(data.crashMultiplier, true);

    // If player was in round and didn't cash out
    if (isBetActive && !hasCashedOutThisRound) {
      betStatusMsg.textContent = `Crashed at ${data.crashMultiplier.toFixed(2)}x. You lost ${currentBet.toFixed(2)} credits.`;
      betStatusMsg.className = 'status-msg lose';
      isBetActive = false;
    }

    btnBet.disabled = false;
    btnCashout.disabled = true;

    // Add to history
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

  // If game is currently running, activate cashout immediately
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
