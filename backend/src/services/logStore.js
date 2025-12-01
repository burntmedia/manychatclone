const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'logs.json');
const MAX_LOGS = 200;

function ensureStore() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
  }
}

function readLogs() {
  ensureStore();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function addLog(entry) {
  ensureStore();
  const current = readLogs();
  current.push(entry);
  const trimmed = current.slice(-MAX_LOGS);
  fs.writeFileSync(DATA_PATH, JSON.stringify(trimmed, null, 2));
}

module.exports = {
  addLog,
  readLogs
};
