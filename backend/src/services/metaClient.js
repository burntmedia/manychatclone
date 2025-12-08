const { log, logError } = require('../utils/logger');

async function sendPublicReply({ commentId, message, accessToken }) {
  if (!commentId || !message || !accessToken) {
    logError('Missing fields for public reply', null, { commentId, hasMessage: Boolean(message), hasAccessToken: Boolean(accessToken) });
    return null;
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(commentId)}/replies`;
  const body = { message, access_token: accessToken };
  const payload = await postJson(url, body, 'public reply', { commentId });

  log('Instagram public reply sent', { commentId, payload });
  return payload;
}

async function sendPrivateMessage({ userId, message, accessToken }) {
  if (!userId || !message || !accessToken) {
    logError('Missing fields for private message', null, { userId, hasMessage: Boolean(message), hasAccessToken: Boolean(accessToken) });
    return null;
  }

  const url = `https://graph.facebook.com/v21.0/me/messages`;
  const body = {
    recipient: { id: userId },
    message: { text: message },
    access_token: accessToken
  };

  return postJson(url, body, 'private message', { userId });
}

async function postJson(url, body, label, context = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let payload;
    try {
      payload = await response.json();
    } catch (parseError) {
      logError(`Meta API ${label} response parse failed`, parseError, { url, context });
      throw parseError;
    }

    if (!response.ok) {
      const error = new Error(`Meta API ${label} failed with status ${response.status}`);
      logError(`Meta API ${label} failed`, error, { status: response.status, payload, context });
      throw error;
    }

    log(`Meta API ${label} succeeded`, { payload, context });
    return payload;
  } catch (error) {
    logError(`Meta API ${label} call failed`, error, context);
    throw error;
  }
}

module.exports = { sendPublicReply, sendPrivateMessage };
