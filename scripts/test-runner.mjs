import 'dotenv/config';
import { open, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { assertTestDatabase } from './safety.mjs';
import { run, nodeRun, stopTree, stopChildren } from './process.mjs';
const mode = process.argv[2] || 'main';
let lock, server;
let cleaning;
async function cleanup() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    await stopChildren();
    await stopTree(server);
    if (lock) { await lock.close(); await unlink('.test-run.lock'); }
  })();
  return cleaning;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await cleanup(); process.exit(130); });
try {
  if (!['main', 'infra', 'bonus'].includes(mode)) throw new Error('Unknown test mode');
  const databaseUrl = assertTestDatabase();
  if (process.env.DATABASE_URL === databaseUrl) throw new Error('Development and test DATABASE_URL must differ');
  try { lock = await open('.test-run.lock', 'wx'); await lock.writeFile(String(process.pid)); }
  catch { throw new Error('Another test run is active (.test-run.lock). If interrupted forcibly, verify its PID before removing the lock.'); }
  const env = { ...process.env, DEVELOPMENT_DATABASE_URL: process.env.DATABASE_URL, DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl, NEXT_DIST_DIR: '.next-test', NEXT_TELEMETRY_DISABLED: '1', CHALLENGE_TEST_RUN: '1' };
  console.log('Checking Docker and starting isolated PostgreSQL...');
  await run('docker', ['info', '--format', '{{.ServerVersion}}']);
  await run('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '90', 'db-test']);
  await nodeRun('node_modules/prisma/build/index.js', ['migrate', 'deploy'], env);
  await nodeRun('node_modules/prisma/build/index.js', ['db', 'pull'], env);
  await nodeRun('node_modules/prisma/build/index.js', ['generate'], env);
  await nodeRun('node_modules/tsx/dist/cli.mjs', ['tests/fixtures/prepare.ts'], env);
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => { const address = probe.address(); probe.close(() => resolve(address.port)); });
  });
  env.API_BASE_URL = 'http://127.0.0.1:' + port;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
  let spawnError;
  server.on('error', e => { spawnError = e; });
  const deadline = Date.now() + 120000;
  let ready = false;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw new Error('Next.js exited before readiness');
    try { const r = await fetch(env.API_BASE_URL + '/api/health', { signal: AbortSignal.timeout(3000) }); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  if (!ready) throw new Error('API readiness timed out');
  console.log('PostgreSQL, migrations, fixtures and HTTP server ready. Running ' + mode + ' tests.');
  await nodeRun('node_modules/vitest/vitest.mjs', ['run', '--config', 'vitest.config.ts'], { ...env, TEST_MODE: mode });
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await cleanup(); }
