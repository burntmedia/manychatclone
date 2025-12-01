const { loadEnv } = require('../src/utils/env');
const { readStore } = require('../src/services/store');

loadEnv();

const missing = ['APP_ID', 'APP_SECRET', 'VERIFY_TOKEN', 'PAGE_ACCESS_TOKEN', 'SERVER_URL']
  .filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(`Warning: missing environment keys -> ${missing.join(', ')}`);
} else {
  console.log('All required env vars are set.');
}

const store = readStore();
console.log(`Loaded ${store.global.length} global keywords and ${Object.keys(store.posts).length} post entries.`);
