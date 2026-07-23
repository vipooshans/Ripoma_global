/**
 * LOCAL DEV ONLY — temporary quick tunnel to Express :5000.
 *
 * Production should use a permanent host:
 *   npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
 *   # https://YOUR-SERVICE.onrender.com  (or Railway/Fly)
 *
 * This script still pushes a temporary tunnel URL for emergency local testing.
 * Prefer Render/Railway for anything that must stay up when this PC is offline.
 */
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout as sleep } from 'timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(args, input) {
  const result = spawnSync('npx', args, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    input
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) process.exit(result.status || 1);
  return result.stdout || '';
}

const health = spawnSync('curl.exe', ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '3', 'http://127.0.0.1:5000/health'], {
  encoding: 'utf8',
  shell: true
});
if (String(health.stdout || '').trim() !== '200') {
  console.error('Local Express is not healthy on :5000. Start it with: cd server && npm run dev');
  process.exit(1);
}

console.log('Starting cloudflared quick tunnel...');
const cf = spawn('npx', ['--yes', 'cloudflared@latest', 'tunnel', '--url', 'http://127.0.0.1:5000'], {
  cwd: root,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

let tunnelUrl = '';
const onChunk = (buf) => {
  const text = buf.toString();
  process.stderr.write(text);
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !tunnelUrl) tunnelUrl = m[0];
};
cf.stdout.on('data', onChunk);
cf.stderr.on('data', onChunk);

for (let i = 0; i < 60 && !tunnelUrl; i++) {
  await sleep(500);
}
if (!tunnelUrl) {
  console.error('Timed out waiting for trycloudflare URL');
  cf.kill();
  process.exit(1);
}

console.log(`\nTunnel: ${tunnelUrl}`);
run(['wrangler', 'secret', 'put', 'API_ORIGIN', '-c', 'wrangler.proxy.jsonc'], `${tunnelUrl}\n`);

const uploadOut = run(['wrangler', 'versions', 'upload', '-c', 'wrangler.proxy.jsonc']);
const id = (uploadOut.match(/Worker Version ID:\s*([0-9a-f-]+)/i) || [])[1];
if (!id) {
  console.error('Could not parse version id');
  process.exit(1);
}
run([
  'wrangler',
  'versions',
  'deploy',
  `${id}@100`,
  '-y',
  '-c',
  'wrangler.proxy.jsonc',
  '--message',
  'Refresh API_ORIGIN quick tunnel'
]);

console.log(`
API_ORIGIN updated and Worker redeployed.
Keep this process running (cloudflared). Ctrl+C stops the tunnel and APIs will 503 again.
Permanent fix: deploy server/ to Render and set API_ORIGIN to that URL.
`);

// keep tunnel alive
await new Promise((resolve) => cf.on('exit', resolve));
