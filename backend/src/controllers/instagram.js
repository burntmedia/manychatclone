const fs = require('fs').promises;
const path = require('path');
const { loadTokens } = require('./auth');
const { log, logError } = require('../utils/logger');
const { writeJson, readJson } = require('../utils/jsonStore');

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const POSTS_FILE = 'instagramPosts.json';
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const POSTS_PATH = path.join(DATA_DIR, POSTS_FILE);
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function resolveAccess() {
  const tokens = loadTokens();
  const entries = Object.values(tokens).filter(
    (entry) => entry && typeof entry === 'object' && entry.access_token && entry.ig_id
  );

  const target = entries[0];

  return {
    igId: target?.ig_id || null,
    accessToken: target?.access_token || null
  };
}

async function fetchInstagramMedia() {
  const { igId, accessToken } = resolveAccess();

  if (!igId || !accessToken) {
    throw new Error('Instagram account is not connected');
  }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url = `${GRAPH_BASE}/${encodeURIComponent(igId)}/media?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(url);
    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message || 'Failed to fetch Instagram media';
      throw new Error(message);
    }

    const mapped = Array.isArray(payload.data)
      ? payload.data
          .map((item) => ({
            mediaId: item.id,
            mediaUrl: item.media_url,
            thumbnail: item.thumbnail_url || item.media_url || '',
            caption: item.caption || '',
            permalink: item.permalink || '',
            mediaType: item.media_type || '',
            timestamp: item.timestamp || null
          }))
          .filter((item) => item.mediaId && item.mediaUrl)
      : [];

    log('Fetched Instagram media', { count: mapped.length });
    return mapped;
  } catch (error) {
    logError('Failed to fetch Instagram media', error);
    throw error;
  }
}

async function isCacheFresh() {
  try {
    const stats = await fs.stat(POSTS_PATH);
    return Date.now() - stats.mtimeMs < CACHE_TTL_MS;
  } catch (_error) {
    return false;
  }
}

async function getCachedMedia({ forceRefresh = false } = {}) {
  const fresh = !forceRefresh && (await isCacheFresh());

  if (fresh) {
    return readJson(POSTS_FILE, []);
  }

  const media = await fetchInstagramMedia();
  try {
    await writeJson(POSTS_FILE, media);
  } catch (error) {
    logError('Failed to cache Instagram media', error);
  }
  return media;
}

module.exports = { fetchInstagramMedia, getCachedMedia };
