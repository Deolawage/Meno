const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { spawn } = require('node:child_process');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const port = 3100 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-that-is-at-least-32-characters-long';
let child;

async function request(route, options = {}) {
  return fetch(`${baseUrl}${route}`, options);
}

before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), JWT_SECRET: jwtSecret },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server did not start')), 10000);
    child.stdout.on('data', data => {
      if (data.toString().includes(`http://localhost:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('error', reject);
    child.stderr.on('data', data => process.stderr.write(data));
  });
});

after(() => child?.kill());

test('serves the application shell', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Meno/);
});

test('rejects protected routes without a token', async () => {
  for (const route of ['/api/me', '/api/dms', '/api/courses']) {
    const response = await request(route);
    assert.equal(response.status, 401, route);
  }
});

test('validates registration input before database access', async () => {
  const response = await request('/api/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'not-an-email', password: 'short' })
  });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /valid email|between 2 and 80/i);
});

test('validates profile updates for authenticated users', async () => {
  const token = jwt.sign({ id: 'test-user', email: 'test@example.com' }, jwtSecret);
  const response = await request('/api/me/profile', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'A', bio: 'x'.repeat(241) })
  });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Name must be between 2 and 80/);
});

test('requires a file for authenticated uploads', async () => {
  const token = jwt.sign({ id: 'test-user', email: 'test@example.com' }, jwtSecret);
  const response = await request('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /No file uploaded/);
});
