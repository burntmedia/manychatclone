const querystring = require('querystring');
const { log, logError } = require('../utils/logger');

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_engagement',
  'pages_messaging',
  'instagram_manage_comments',
  'instagram_manage_messages'
];

function ensureEnv() {
  const required = ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI', 'VERIFY_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

function buildLoginUrl(state = '') {
  ensureEnv();
  const params = querystring.stringify({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    state,
    scope: SCOPES.join(','),
    response_type: 'code'
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

async function exchangeCodeForShortLivedToken(code) {
  ensureEnv();
  const params = querystring.stringify({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: process.env.META_REDIRECT_URI,
    code
  });
  const url = `${GRAPH_BASE}/oauth/access_token?${params}`;
  return fetchJson(url, 'exchange short-lived token');
}

async function exchangeForLongLivedUserToken(shortLivedToken) {
  ensureEnv();
  const params = querystring.stringify({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken
  });
  const url = `${GRAPH_BASE}/oauth/access_token?${params}`;
  return fetchJson(url, 'exchange long-lived user token');
}

async function fetchPages(userAccessToken) {
  const fields = ['id', 'name', 'access_token', 'instagram_business_account{id}'].join(',');
  const url = `${GRAPH_BASE}/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(userAccessToken)}`;
  const data = await fetchJson(url, 'fetch pages');
  return data?.data || [];
}

async function fetchInstagramAccount(pageId, userAccessToken) {
  const url = `${GRAPH_BASE}/${pageId}?fields=instagram_business_account{id}&access_token=${encodeURIComponent(userAccessToken)}`;
  const data = await fetchJson(url, 'fetch instagram account for page');
  return data?.instagram_business_account?.id ? { id: data.instagram_business_account.id } : null;
}

async function fetchLongLivedPageToken(pageId, userAccessToken) {
  const url = `${GRAPH_BASE}/${pageId}?fields=access_token&access_token=${encodeURIComponent(userAccessToken)}`;
  const data = await fetchJson(url, 'fetch long-lived page token');
  return data?.access_token;
}

async function fetchJson(url, action) {
  try {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) {
      logError(`Meta OAuth failed: ${action}`, null, { status: response.status, payload });
      throw new Error(payload?.error?.message || `Meta OAuth error during ${action}`);
    }
    return payload;
  } catch (error) {
    logError(`Meta OAuth request failed: ${action}`, error);
    throw error;
  }
}

module.exports = {
  buildLoginUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedUserToken,
  fetchPages,
  fetchInstagramAccount,
  fetchLongLivedPageToken
};
