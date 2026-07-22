/**
 * Upload + promote the proxy Worker without needing an interactive
 * workers.dev subdomain registration prompt.
 *
 * Usage: node scripts/deploy-proxy.mjs
 * Then set: npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const config = 'wrangler.proxy.jsonc';

function run(args) {
  const result = spawnSync('npx', ['wrangler', ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: true
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  return result.stdout || '';
}

const uploadOut = run(['versions', 'upload', '-c', config]);
const match = uploadOut.match(/Worker Version ID:\s*([0-9a-f-]+)/i);
if (!match) {
  console.error('Could not parse Worker Version ID from wrangler output.');
  process.exit(1);
}

const versionId = match[1];
console.log(`\nPromoting version ${versionId} to 100% traffic...\n`);
run([
  'versions',
  'deploy',
  `${versionId}@100`,
  '-y',
  '-c',
  config,
  '--message',
  'Proxy gateway deploy'
]);

console.log(`
Done. If https://YOUR-WORKER.workers.dev still shows the old stub:
  1. Open https://dash.cloudflare.com/ → Workers → Onboarding
     and register your workers.dev subdomain on THIS account.
  2. Enable workers.dev for the ripomaglobal1 worker.
  3. Set the backend origin:
       npx wrangler secret put API_ORIGIN -c wrangler.proxy.jsonc
     (value like https://your-service.onrender.com — no /api)
`);
