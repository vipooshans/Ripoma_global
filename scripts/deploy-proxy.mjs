/**
 * Deploy the proxy Worker (Render/Railway/Fly behind API_ORIGIN).
 *
 * Usage:
 *   npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
 *   # paste full URL: https://YOUR-SERVICE.onrender.com  (https:// required, no /api)
 *   npm run deploy:proxy
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const config = 'wrangler.proxy.jsonc';
const wranglerBin = path.join(root, 'node_modules', '.bin', 'wrangler.cmd');

function run(args) {
  const result = spawnSync(wranglerBin, args, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    windowsHide: true
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

console.log('Uploading proxy Worker version...\n');
const uploadOut = run(['versions', 'upload', '-c', config]);
const match = uploadOut.match(/Worker Version ID:\s*([0-9a-f-]+)/i);
if (!match) {
  console.error('Could not parse Worker Version ID from wrangler output.');
  process.exit(1);
}

const versionId = match[1];
console.log(`\nPromoting version ${versionId} to 100% traffic...\n`);

let promoted = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  const result = spawnSync(
    wranglerBin,
    [
      'versions',
      'deploy',
      `${versionId}@100`,
      '-y',
      '-c',
      config,
      '--message',
      'Proxy-gateway-deploy'
    ],
    { cwd: root, encoding: 'utf8', shell: true, windowsHide: true }
  );
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status === 0) {
    promoted = true;
    break;
  }
  console.error(`Promote attempt ${attempt} failed; waiting 3s...`);
  spawnSync(process.execPath, ['-e', 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,3000)']);
}

if (!promoted) {
  console.error(`
Promote failed. Run manually:
  npx wrangler versions deploy ${versionId}@100 -y -c wrangler.proxy.jsonc
`);
  process.exit(1);
}

console.log(`
Done.

API_ORIGIN must be a FULL URL (https:// required, no /api):
  npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
  # example: https://ripoma-api.onrender.com

Smoke-test:
  curl https://ripomaglobal1.ripomaglobal.workers.dev/health
`);
