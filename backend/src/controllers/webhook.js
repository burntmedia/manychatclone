const { log, logError } = require('../utils/logger');
const { getKeywordsForPost } = require('../services/store');
const { findMatch } = require('../services/matcher');
const { sendPublicReply, sendPrivateMessage } = require('../services/metaClient');
const { loadTokens } = require('./auth');

function handleVerification(req, res, query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(challenge);
    return;
  }

  res.writeHead(403);
  res.end();
}

async function handleWebhook(body) {
  if (!body.entry || !Array.isArray(body.entry)) {
    log('Webhook payload missing entries', { body });
    return;
  }

  for (const entry of body.entry) {
    const changes = entry.changes || [];
    for (const change of changes) {
      await processChange(change, entry.id);
    }
  }
}

async function processChange(change, entryPageId) {
  if (!change.value || !change.value.text) {
    return;
  }
  const { text, comment_id: commentId, post_id: postId, from } = change.value;
  const keywordSets = getKeywordsForPost(postId);
  const match = findMatch(text, keywordSets);

  if (!match) {
    log('No keyword match found', { postId, text });
    return;
  }

  const commentTemplates = match.commentReplies || ["Thanks for reaching out about {{keyword}}!"];
  const dmTemplates = match.dmReplies || ["Here's the link you asked for: {{resourceUrl}}"];
  const resourceUrl = match.resourceUrl || '';

  const commentReply = personalize(commentTemplates, { keyword: match.keyword, resourceUrl });
  const dmReply = personalize(dmTemplates, { keyword: match.keyword, resourceUrl });

  const pageId = change.value.page_id || entryPageId;
  const accessToken = lookupPageToken(pageId);

  if (!accessToken) {
    logError('No access token found for page', null, { pageId });
    return;
  }

  log('Matched keyword, sending replies', { keyword: match.keyword, postId, commentId, userId: from?.id, pageId });

  await sendPublicReply({ commentId, message: commentReply, accessToken });

  if (from?.id) {
    await sendPrivateMessage({ userId: from.id, message: dmReply, accessToken });
  }
}

function personalize(templates, context) {
  const chosen = templates[Math.floor(Math.random() * templates.length)];
  return chosen
    .replace(/{{keyword}}/g, context.keyword || '')
    .replace(/{{resourceUrl}}/g, context.resourceUrl || '');
}

function lookupPageToken(pageId) {
  if (!pageId) {
    return null;
  }

  try {
    const tokens = loadTokens();
    const entry = tokens[pageId];
    return entry?.access_token || null;
  } catch (error) {
    logError('Failed to read token store', error);
    return null;
  }
}

module.exports = { handleVerification, handleWebhook };
