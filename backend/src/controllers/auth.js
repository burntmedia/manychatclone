const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildLoginUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedUserToken,
  fetchPages,
  fetchInstagramAccount,
  fetchLongLivedPageToken
} = require('../services/metaOAuth');
const { log, logError } = require('../utils/logger');

const TOKENS_PATH = path.join(process.cwd(), 'data', 'tokens.json');

function ensureTokenStore() {
  const dir = path.dirname(TOKENS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(TOKENS_PATH)) {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify({}, null, 2));
  }
}

function loadTokens() {
  ensureTokenStore();
  const raw = fs.readFileSync(TOKENS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveTokens(tokens) {
  ensureTokenStore();
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

async function handleLoginRedirect(req, res) {
  try {
    const state = crypto.randomBytes(8).toString('hex');
    const loginUrl = buildLoginUrl(state);
    res.writeHead(302, { Location: loginUrl });
    res.end();
  } catch (error) {
    logError('Failed to start Meta login', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Meta OAuth configuration missing' }));
  }
}

async function handleAuthCallback(req, res, query) {
  if (query.error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: query.error_description || query.error }));
    return;
  }

  const code = query.code;
  const requestedPageId = query.page_id;

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing OAuth code' }));
    return;
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLivedUser = await exchangeForLongLivedUserToken(shortLived.access_token);

    const pages = await fetchPages(longLivedUser.access_token);
    log('Fetched pages for user', { count: pages.length });

    const enrichedPages = [];
    for (const page of pages) {
      const igAccount = page.instagram_business_account || (await fetchInstagramAccount(page.id, longLivedUser.access_token));
      enrichedPages.push({ ...page, instagram_business_account: igAccount });
    }

    const targetPage = pickPage(enrichedPages, requestedPageId);
    if (!targetPage) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'No Instagram Business Account found on connected Pages. Provide ?page_id=PAGE_ID to pick a specific page.'
        })
      );
      return;
    }

    const pageAccessToken = await fetchLongLivedPageToken(targetPage.id, longLivedUser.access_token);
    if (!pageAccessToken) {
      throw new Error('Failed to fetch Page access token');
    }

    const tokens = loadTokens();
    const expiresAt = longLivedUser.expires_in
      ? new Date(Date.now() + longLivedUser.expires_in * 1000).toISOString()
      : null;
    tokens[targetPage.id] = {
      ig_id: targetPage.instagram_business_account.id,
      page_id: targetPage.id,
      access_token: pageAccessToken,
      expires_at: expiresAt
    };

    // ---- NEW PATCH: Add reverse IG → Page lookup ----
    tokens.igToPage = tokens.igToPage || {};
    tokens.igToPage[targetPage.instagram_business_account.id] = targetPage.id;

    saveTokens(tokens);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: 'Page connected successfully',
        page_id: targetPage.id,
        instagram_business_id: targetPage.instagram_business_account.id,
        expires_at: expiresAt
      })
    );
  } catch (error) {
    logError('OAuth callback failed', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

function pickPage(pages, requestedPageId) {
  if (requestedPageId) {
    return pages.find((page) => page.id === requestedPageId);
  }
  return pages.find((page) => page.instagram_business_account && page.instagram_business_account.id);
}

module.exports = { handleLoginRedirect, handleAuthCallback, loadTokens };
