/**
 * PM2 process list — keeps API + Cloudflare Tunnel alive after closing Cursor.
 *
 * Start:  npm run api:online
 * Status: npx pm2 list
 * Logs:   npx pm2 logs
 * Stop:   npm run api:offline
 *
 * Note: this keeps the site up while THIS PC is on. For always-on in the cloud,
 * deploy server/ to Render and set API_ORIGIN to https://YOUR.onrender.com.
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const root = __dirname;
const serverEnv = loadEnvFile(path.join(root, 'server', '.env'));

const apiEnv = {
  ...serverEnv,
  NODE_ENV: 'production',
  PORT: '5000',
  FRONTEND_URL: 'https://ripoma-global.pages.dev',
  CORS_PAGES_HOST: 'ripoma-global.pages.dev',
  CUSTOMER_REQUIRE_EMAIL_VERIFICATION:
    serverEnv.CUSTOMER_REQUIRE_EMAIL_VERIFICATION || 'false'
};

module.exports = {
  apps: [
    {
      name: 'ripoma-api',
      cwd: path.join(root, 'server'),
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: apiEnv
    },
    {
      name: 'ripoma-tunnel',
      cwd: root,
      script: 'scripts/persistent-tunnel.mjs',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
