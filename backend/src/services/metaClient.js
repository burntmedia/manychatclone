const { log, logError } = require('../utils/logger');

async function sendPublicReply({ commentId, message, accessToken }) {
  if (!commentId || !message || !accessToken) {
    logError('Missing fields for public reply', null, { commentId, hasMessage: Boolean(message), hasAccessToken: Boolean(accessToken) });
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${commentId}/replies`;
  const body = { message, access_token: accessToken };
  await postJson(url, body, 'public reply');
}

async function sendPrivateMessage({ userId, message, accessToken }) {
  if (!userId || !message || !accessToken) {
    logError('Missing fields for private message', null, { userId, hasMessage: Boolean(message), hasAccessToken: Boolean(accessToken) });
    return;
  }

  const url = `https://graph.facebook.com/v21.0/me/messages`;
  const body = {
    recipient: { id: userId },
    message: { text: message },
    access_token: accessToken
  };

  await postJson(url, body, 'private message');
}

async function postJson(url, body, label) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const payload = await response.json();
    if (!response.ok) {
      logError(`Meta API ${label} failed`, null, { status: response.status, payload });
      return;
    }
    log(`Meta API ${label} succeeded`, { payload });
  } catch (error) {
    logError(`Meta API ${label} call failed`, error);
  }
}

module.exports = { sendPublicReply, sendPrivateMessage };
