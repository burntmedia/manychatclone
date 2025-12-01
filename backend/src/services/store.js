const fs = require('fs');
const path = require('path');
const { log, logError } = require('../utils/logger');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'keywords.json');

function ensureStore() {
  if (!fs.existsSync(DATA_PATH)) {
    const seed = {
      global: [],
      posts: {}
    };
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(seed, null, 2));
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeStore(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getKeywordsForPost(postId) {
  const store = readStore();
  return {
    global: store.global || [],
    local: (store.posts && store.posts[postId]) || []
  };
}

function upsertKeyword({ scope = 'global', postId, keywordConfig }) {
  const store = readStore();
  if (scope === 'global') {
    store.global = upsertList(store.global || [], keywordConfig);
  } else if (scope === 'post' && postId) {
    store.posts = store.posts || {};
    const current = store.posts[postId] || [];
    store.posts[postId] = upsertList(current, keywordConfig);
  } else {
    logError('Invalid scope provided to upsertKeyword', null, { scope, postId });
    return;
  }
  writeStore(store);
}

function upsertList(list, keywordConfig) {
  const next = list.filter((item) => item.keyword !== keywordConfig.keyword);
  next.push(keywordConfig);
  return next;
}

module.exports = {
  getKeywordsForPost,
  upsertKeyword,
  readStore
};
