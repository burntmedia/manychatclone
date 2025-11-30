const fs = require('fs');
const path = require('path');

function loadEnv(fileName = '.env') {
  const envPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) {
    return;
  }

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
