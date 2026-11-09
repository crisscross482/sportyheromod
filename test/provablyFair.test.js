const test = require('node:test');
const assert = require('node:assert');
const { generateHashChain, calculateCrashPoint, verifyHashLink } = require('../provablyFair');

test('generateHashChain generates expected chain length and preserves SHA-256 links', () => {
  const seed = 'test_seed_123';
  const count = 10;
  const chain = generateHashChain(seed, count);

  assert.strictEqual(chain.length, count + 1);
  assert.strictEqual(chain[0], seed);

  // Each element chain[i+1] must be SHA256 of chain[i]
  for (let i = 0; i < count; i++) {
    const isValid = verifyHashLink(chain[i], chain[i + 1]);
    assert.strictEqual(isValid, true, `Hash link failed between step ${i} and ${i + 1}`);
  }
});

test('verifyHashLink detects invalid hashes', () => {
  const seedA = 'test_seed_A';
  const seedB = 'test_seed_B';
  const chainA = generateHashChain(seedA, 2);

  assert.strictEqual(verifyHashLink(seedB, chainA[1]), false);
});

test('calculateCrashPoint is deterministic given same seeds', () => {
  const serverSeed = 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const clientSeed = 'demo_salt_test';

  const m1 = calculateCrashPoint(serverSeed, clientSeed);
  const m2 = calculateCrashPoint(serverSeed, clientSeed);

  assert.strictEqual(m1, m2);
  assert.ok(m1 >= 1.00);
});

test('calculateCrashPoint yields valid distribution across multiple random samples', () => {
  const clientSeed = 'salt_distribution_test';
  let total = 0;
  let minM = Infinity;
  let maxM = 0;
  const N = 1000;

  for (let i = 0; i < N; i++) {
    const seed = 'sample_seed_' + i;
    const m = calculateCrashPoint(seed, clientSeed);
    assert.ok(m >= 1.00, `Multiplier must be >= 1.00, got ${m}`);
    total += m;
    if (m < minM) minM = m;
    if (m > maxM) maxM = m;
  }

  assert.strictEqual(minM, 1.00);
  assert.ok(maxM > 2.00, 'Expected at least some higher multipliers');
});
