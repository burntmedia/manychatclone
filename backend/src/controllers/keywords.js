const { readStore, upsertKeyword } = require('../services/store');
const { log } = require('../utils/logger');

function listKeywords(res) {
  const data = readStore();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function saveKeyword(body, res) {
  const { scope = 'global', postId = '', keyword, variants = [], commentReplies = [], dmReplies = [], resourceUrl = '' } = body;

  if (!keyword || typeof keyword !== 'string') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'keyword is required' }));
    return;
  }

  if (scope === 'post' && !postId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'postId is required for post-specific keywords' }));
    return;
  }

  const keywordConfig = {
    keyword: keyword.trim(),
    variants: Array.isArray(variants) ? variants.map((v) => v.trim()).filter(Boolean) : [],
    commentReplies: Array.isArray(commentReplies) ? commentReplies.map((v) => v.trim()).filter(Boolean) : [],
    dmReplies: Array.isArray(dmReplies) ? dmReplies.map((v) => v.trim()).filter(Boolean) : [],
    resourceUrl: resourceUrl || ''
  };

  upsertKeyword({ scope, postId, keywordConfig });
  log('Upserted keyword', { scope, postId, keyword: keywordConfig.keyword });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ saved: true }));
}

module.exports = { listKeywords, saveKeyword };
