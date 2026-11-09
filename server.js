const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateHashChain, calculateCrashPoint, verifyHashLink } = require('./provablyFair');

const PORT = process.env.PORT || 3000;

// Initialize provably fair chain (100 rounds for demo)
const initialSeed = 'educational_secret_chain_root_' + Date.now();
const CHAIN_LENGTH = 100;
const fullChain = generateHashChain(initialSeed, CHAIN_LENGTH);
// fullChain[0] is root, fullChain[CHAIN_LENGTH] is genesis hash
// Rounds will consume backwards from fullChain[CHAIN_LENGTH] down to 1
let currentRoundIndex = CHAIN_LENGTH;
const clientSeed = 'sporty_hero_edu_demo_client_seed_2025';

// Game State
let roundId = 1;
let gameState = 'WAITING'; // 'WAITING', 'RUNNING', 'CRASHED'
let crashMultiplier = 1.00;
let currentMultiplier = 1.00;
let roundStartTime = 0;
let roundHash = fullChain[currentRoundIndex];
let history = []; // list of completed rounds
let sseClients = [];

function broadcast(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

function startRound() {
  gameState = 'WAITING';
  let countdown = 5; // 5-second countdown between rounds

  const cdInterval = setInterval(() => {
    broadcast('countdown', { countdown });
    countdown -= 1;
    if (countdown < 0) {
      clearInterval(cdInterval);
      launchRound();
    }
  }, 1000);
}

function launchRound() {
  if (currentRoundIndex <= 0) {
    // Regenerate chain if exhausted
    currentRoundIndex = CHAIN_LENGTH;
  }

  roundHash = fullChain[currentRoundIndex];
  crashMultiplier = calculateCrashPoint(roundHash, clientSeed);
  gameState = 'RUNNING';
  currentMultiplier = 1.00;
  roundStartTime = Date.now();

  broadcast('round_start', {
    roundId,
    clientSeed,
    // Note: roundHash is revealed upon completion for provable fairness verification
    // To prove server commitment without revealing the hash if requested, or reveal previous
    previousHash: currentRoundIndex < CHAIN_LENGTH ? fullChain[currentRoundIndex + 1] : null
  });

  const growthRate = 0.06; // exponential multiplier speed: e^(0.06 * seconds)

  const tickInterval = setInterval(() => {
    if (gameState !== 'RUNNING') {
      clearInterval(tickInterval);
      return;
    }

    const elapsedSeconds = (Date.now() - roundStartTime) / 1000;
    // Exponential formula: 1.00 * e^(0.06 * t)
    currentMultiplier = Math.floor(Math.exp(growthRate * elapsedSeconds) * 100) / 100;

    if (currentMultiplier >= crashMultiplier) {
      currentMultiplier = crashMultiplier;
      gameState = 'CRASHED';
      clearInterval(tickInterval);

      // Record round in history
      const completedRound = {
        roundId,
        crashMultiplier,
        roundHash,
        clientSeed,
        timestamp: new Date().toISOString()
      };
      history.unshift(completedRound);
      if (history.length > 50) history.pop();

      broadcast('crash', completedRound);

      // Advance round index
      currentRoundIndex -= 1;
      roundId += 1;

      // Start next round after pause
      setTimeout(startRound, 2500);
    } else {
      broadcast('tick', { currentMultiplier });
    }
  }, 100);
}

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Static files handling
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'public', 'index.html')).pipe(res);
    return;
  }
  if (pathname === '/style.css') {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    fs.createReadStream(path.join(__dirname, 'public', 'style.css')).pipe(res);
    return;
  }
  if (pathname === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(path.join(__dirname, 'public', 'app.js')).pipe(res);
    return;
  }

  // API Endpoints
  if (pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      roundId,
      gameState,
      currentMultiplier,
      history,
      clientSeed,
      genesisHash: fullChain[CHAIN_LENGTH]
    }));
    return;
  }

  if (pathname === '/api/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { serverSeed, clientSeed: cSeed, previousHash } = data;

        const calculatedMultiplier = calculateCrashPoint(serverSeed, cSeed || clientSeed);
        let hashChainValid = null;
        if (previousHash) {
          hashChainValid = verifyHashLink(serverSeed, previousHash);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          valid: true,
          calculatedMultiplier,
          hashChainValid
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Server-Sent Events (SSE) for live stream
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Educational Crash Game server running at http://localhost:${PORT}`);
    startRound();
  });
}

module.exports = { server, calculateCrashPoint, verifyHashLink, generateHashChain };
