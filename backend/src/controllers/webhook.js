const { log, logError } = require('../utils/logger');
const { getKeywordsForPost } = require('../services/store');
const { findMatch } = require('../services/matcher');
const { sendPublicReply, sendPrivateMessage } = require('../services/metaClient');
const { loadTokens } = require('./auth');

function handleVerification(req, res) {
  log('Webhook verification received', { query: req.query, headers: req.headers });

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).type('text/plain').send(challenge);
    return;
  }

  res.status(403).send('Forbidden');
}

async function handleWebhook(req, res) {
  try {
    log('Webhook POST received', {
      headers: req.headers,
      rawBody: req.rawBody || null,
      parsedBodyType: typeof req.body,
      hasBody: !!req.body
    });

    const body = (req.body && typeof req.body === 'object') ? req.body : {};

    if (!Array.isArray(body.entry) || body.entry.length === 0) {
      log('Webhook payload missing entries', { body });
      res.json({ received: true });
      return;
    }

    for (const entry of body.entry) {
      const entryId = entry?.id || 'unknown';
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      if (changes.length === 0) {
        log('Webhook entry missing changes', { entryId, entry });
        continue;
      }

      for (const change of changes) {
        try {
          if (body.object === 'instagram') {
            await processInstagramComment(change, entryId);
          } else if (body.object === 'page') {
            await processPageComment(change, entryId);
          } else {
            log('Unhandled webhook object type', { object: body.object, entryId, change });
          }
        } catch (error) {
          logError('Failed to process webhook change', error, { entryId, change });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    logError('Webhook handler failed', error, { rawBody: req.rawBody || null });
    if (!res.headersSent) {
      res.json({ received: true });
    }
  }
}

async function processInstagramComment(change, entryId) {
  log('Instagram change received', { entryId, field: change?.field, change });

  if (change?.field !== 'comments') {
    log('Ignoring non-comment Instagram change', { entryId, field: change?.field });
    return;
  }

  const value = change?.value;
  if (!value || typeof value !== 'object') {
    log('Instagram change missing value', { entryId, change });
    return;
  }

  const commentId = value.comment_id || value.id;
  const postId = value.post_id || value.media_id;
  const text = value.text || '';
  const userId = value.from?.id;

  await handleCommentReply({
    entryId,
    commentId,
    postId,
    text,
    userId,
    source: 'instagram'
  });
}

async function processPageComment(change, entryId) {
  log('Page change received', { entryId, field: change?.field, change });

  const value = change?.value;
  if (!value || typeof value !== 'object') {
    log('Page change missing value', { entryId, change });
    return;
  }

  // Facebook page webhook payloads commonly surface comments under feed/comment fields
  const isCommentChange = change?.field === 'feed' || change?.field === 'comments' || value.item === 'comment';
  if (!isCommentChange) {
    log('Ignoring non-comment page change', { entryId, field: change?.field, item: value.item });
    return;
  }

  const commentId = value.comment_id || value.id;
  const postId = value.post_id || value.parent_id;
  const text = value.message || value.text || '';
  const userId = value.from?.id;

  await handleCommentReply({
    entryId,
    commentId,
    postId,
    text,
    userId,
    source: 'page'
  });
}

async function handleCommentReply({ entryId, commentId, postId, text, userId, source }) {
  if (!commentId) {
    log('Comment change missing identifier', { entryId, source, postId, text });
    return;
  }

  const { pageId, accessToken } = resolveAccess(entryId);
  if (!accessToken) {
    logError('No access token available for webhook entry', null, { entryId, source });
    return;
  }

  const keywordSets = getKeywordsForPost(postId);
  const match = findMatch(text || '', keywordSets);

  if (!match) {
    log('No keyword match found', { source, postId, text });
    return;
  }

  const commentTemplates = match.commentReplies || ['Thanks for reaching out about {{keyword}}!'];
  const dmTemplates = match.dmReplies || ["Here's the link you asked for: {{resourceUrl}}"];
  const resourceUrl = match.resourceUrl || '';

  const commentReply = personalize(commentTemplates, { keyword: match.keyword, resourceUrl });
  const dmReply = personalize(dmTemplates, { keyword: match.keyword, resourceUrl });

  log('Matched keyword, sending replies', {
    source,
    keyword: match.keyword,
    postId,
    commentId,
    userId,
    pageId
  });

  try {
    await sendPublicReply({ commentId, message: commentReply, accessToken });
  } catch (error) {
    logError('Failed to send public reply', error, { commentId, source });
  }

  if (userId) {
    try {
      await sendPrivateMessage({ userId, message: dmReply, accessToken });
    } catch (error) {
      logError('Failed to send private message', error, { userId, source });
    }
  }
}

function personalize(templates, context) {
  const chosen = templates[Math.floor(Math.random() * templates.length)];
  return chosen.replace(/{{keyword}}/g, context.keyword || '').replace(/{{resourceUrl}}/g, context.resourceUrl || '');
}

function resolveAccess(entryId) {
  try {
    const tokens = loadTokens();
    const pageId = tokens.igToPage?.[entryId] || tokens[entryId]?.page_id || entryId;
    const accessToken = tokens[pageId]?.access_token || tokens[entryId]?.access_token || null;

    return { pageId, accessToken };
  } catch (error) {
    logError('Failed to read token store', error, { entryId });
    return { pageId: null, accessToken: null };
  }
}

module.exports = { handleVerification, handleWebhook, processInstagramComment, processPageComment };
