const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { server } = require('../server');

test('Server endpoints test: GET /api/state and POST /api/verify', async (t) => {
  await new Promise((resolve) => server.listen(3099, resolve));

  t.after(() => {
    server.close();
  });

  // Test /api/state
  const stateRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:3099/api/state', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });

  assert.strictEqual(stateRes.statusCode, 200);
  assert.ok(stateRes.body.roundId >= 1);
  assert.ok(typeof stateRes.body.clientSeed === 'string');

  // Test /api/verify
  const testPayload = JSON.stringify({
    serverSeed: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    clientSeed: 'test_client_seed'
  });

  const verifyRes = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3099/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(testPayload);
    req.end();
  });

  assert.strictEqual(verifyRes.statusCode, 200);
  assert.strictEqual(verifyRes.body.valid, true);
  assert.ok(typeof verifyRes.body.calculatedMultiplier === 'number');
  assert.ok(verifyRes.body.calculatedMultiplier >= 1.00);
});
