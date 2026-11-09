const crypto = require('crypto');

/**
 * Generate a SHA-256 hash chain of length `count`.
 * Chain is built from seed: H_0 = seed, H_1 = sha256(H_0), ..., H_n = sha256(H_{n-1})
 * Games are played in reverse order: H_n first, then H_{n-1}, down to H_1.
 */
function generateHashChain(initialSeed, count) {
  const chain = [initialSeed];
  let current = initialSeed;
  for (let i = 0; i < count; i++) {
    current = crypto.createHash('sha256').update(current).digest('hex');
    chain.push(current);
  }
  return chain;
}

/**
 * Deterministically compute the crash multiplier given a serverSeed and clientSeed.
 * Based on industry-standard provably fair HMAC-SHA256 calculation:
 * 1. HMAC-SHA256(serverSeed, clientSeed)
 * 2. Take first 52 bits (13 hex characters)
 * 3. Convert to uniform float r in [0, 1)
 * 4. Apply instant bust check (e.g. 1 in 100 chance for 1.00x)
 * 5. Multiplier = floor((100 - houseEdge) / (1 - r)) / 100
 */
function calculateCrashPoint(serverSeed, clientSeed = 'educational_demo_salt_2025', houseEdgePercent = 1) {
  const hmac = crypto.createHmac('sha256', serverSeed).update(clientSeed).digest('hex');

  // 13 hex chars = 52 bits (max value 2^52 - 1)
  const subHex = hmac.slice(0, 13);
  const intVal = parseInt(subHex, 16);
  const twoTo52 = Math.pow(2, 52);
  const r = intVal / twoTo52;

  // Instant crash (house edge instant bust)
  if (intVal % 100 === 0) {
    return 1.00;
  }

  // Multiplier formula
  const mult = ((100 - houseEdgePercent) / (1 - r)) / 100;
  const rounded = Math.floor(mult * 100) / 100;
  return Math.max(1.00, rounded);
}

/**
 * Verifies that candidatePreviousHash is indeed the pre-image of currentHash:
 * sha256(candidatePreviousHash) === currentHash
 */
function verifyHashLink(candidatePreviousHash, currentHash) {
  const hash = crypto.createHash('sha256').update(candidatePreviousHash).digest('hex');
  return hash.toLowerCase() === currentHash.toLowerCase();
}

module.exports = {
  generateHashChain,
  calculateCrashPoint,
  verifyHashLink
};
