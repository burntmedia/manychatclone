const fs = require('fs');
const path = require('path');

function loadEnv(fileName = '.env') {
  const candidates = [
    path.join(process.cwd(), fileName),
    // Fallback to repo root when running from outside backend/
    path.join(__dirname, '../../', fileName)
  ];

  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  content
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
}

module.exports = { loadEnv };
