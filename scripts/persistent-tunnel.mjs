/**
 * LOCAL DEV ONLY — starts a temporary Cloudflare quick tunnel to Express :5000.
 *
 * Does NOT write API_ORIGIN to the Worker by default (production should use
 * Render / Railway / Fly). Set SYNC_API_ORIGIN=1 to push the tunnel URL to the
 * Worker for emergency local testing.
 *
 * Prefer permanent hosting:
 *   npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
 *   # paste https://YOUR-SERVICE.onrender.com
 */
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const stateFile = path.join(root, '.api-origin-state.json');
const cloudflared = path.join(root, 'bin', 'cloudflared.exe');
const syncToWorker = process.env.SYNC_API_ORIGIN === '1';

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { apiOrigin: '' };
  }
}

function writeState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function run(args, input) {
  const result = spawnSync('npx', args, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    input,
    timeout: 180000
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  return result.status === 0 ? result.stdout || '' : '';
}

async function syncApiOrigin(tunnelUrl) {
  writeState({ apiOrigin: tunnelUrl, updatedAt: new Date().toISOString(), localOnly: !syncToWorker });

  if (!syncToWorker) {
    console.log(
      `[tunnel] Local tunnel ready: ${tunnelUrl}\n` +
        `[tunnel] Not syncing to Worker (set SYNC_API_ORIGIN=1 to override).\n` +
        `[tunnel] Production: set API_ORIGIN to your Render/Railway URL instead.`
    );
    return;
  }

  const prev = readState().apiOrigin;
  if (prev === tunnelUrl && readState().synced) {
    console.log(`[tunnel] API_ORIGIN already ${tunnelUrl}`);
    return;
  }

  console.log(`[tunnel] Updating Worker API_ORIGIN -> ${tunnelUrl}`);
  const put = spawnSync(
    'npx',
    ['wrangler', 'secret', 'put', 'API_ORIGIN', '-c', 'wrangler.proxy.jsonc'],
    { cwd: root, encoding: 'utf8', shell: true, input: `${tunnelUrl}\n`, timeout: 120000 }
  );
  process.stdout.write(put.stdout || '');
  process.stderr.write(put.stderr || '');
  if (put.status !== 0) {
    console.error('[tunnel] Failed to put API_ORIGIN secret');
    return;
  }

  const uploadOut = run(['wrangler', 'versions', 'upload', '-c', 'wrangler.proxy.jsonc']);
  const id = (uploadOut.match(/Worker Version ID:\s*([0-9a-f-]+)/i) || [])[1];
  if (!id) {
    console.error('[tunnel] Could not parse Worker Version ID');
    return;
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
    'Sync local-dev API_ORIGIN tunnel'
  ]);

  writeState({
    apiOrigin: tunnelUrl,
    updatedAt: new Date().toISOString(),
    synced: true
  });
  console.log('[tunnel] Worker API_ORIGIN synced');
}

function startTunnel() {
  if (!fs.existsSync(cloudflared)) {
    console.error(`[tunnel] Missing ${cloudflared}. Download cloudflared first.`);
    process.exit(1);
  }

  console.log('[tunnel] Starting cloudflared quick tunnel -> http://127.0.0.1:5000');
  const child = spawn(
    cloudflared,
    ['tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:5000'],
    { cwd: root, windowsHide: true }
  );

  let settled = false;
  const onChunk = (buf) => {
    const text = buf.toString();
    process.stderr.write(text);
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !settled) {
      settled = true;
      const tunnelUrl = m[0].trim();
      syncApiOrigin(tunnelUrl).catch((err) => console.error('[tunnel] sync failed', err));
    }
  };

  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);
  child.on('exit', (code) => {
    console.error(`[tunnel] cloudflared exited code=${code}; restarting in 3s`);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
