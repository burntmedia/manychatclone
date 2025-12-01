const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'automations.json');

function ensureStore() {
  if (!fs.existsSync(DATA_PATH)) {
    const seed = {
      commentReplies: ['Thanks for commenting about {{keyword}}!'],
      dmReplies: ["Here's the link you asked for: {{resourceUrl}}"],
      resourceUrl: ''
    };
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(seed, null, 2));
  }
}

function readAutomations() {
  ensureStore();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveAutomations(payload = {}) {
  const current = readAutomations();
  const next = {
    commentReplies: sanitizeList(payload.commentReplies, current.commentReplies),
    dmReplies: sanitizeList(payload.dmReplies, current.dmReplies),
    resourceUrl: typeof payload.resourceUrl === 'string' ? payload.resourceUrl.trim() : current.resourceUrl
  };
  fs.writeFileSync(DATA_PATH, JSON.stringify(next, null, 2));
  return next;
}

function sanitizeList(input, fallback) {
  if (!Array.isArray(input)) return fallback || [];
  return input.map((item) => String(item || '').trim()).filter(Boolean);
}

module.exports = {
  readAutomations,
  saveAutomations
};
