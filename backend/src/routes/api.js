const express = require('express');
const crypto = require('crypto');
const { readJson, writeJson } = require('../utils/jsonStore');
const { logError } = require('../utils/logger');
const { getCachedMedia } = require('../controllers/instagram');

const router = express.Router();

const KEYWORDS_FILE = 'keywords.json';

async function loadKeywords() {
  const data = await readJson(KEYWORDS_FILE, []);
  return Array.isArray(data) ? data : [];
}

router.get('/keywords', async (_req, res) => {
  try {
    const keywords = await loadKeywords();
    res.json(keywords);
  } catch (error) {
    logError('Failed to load keywords', error);
    res.status(500).json({ error: 'Failed to load keywords' });
  }
});

router.post('/keywords', async (req, res) => {
  const { keyword, instagramMediaId, responseDm = '', responsePublic = '' } = req.body || {};

  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: 'keyword is required' });
    return;
  }

  if (!instagramMediaId || typeof instagramMediaId !== 'string') {
    res.status(400).json({ error: 'instagramMediaId is required' });
    return;
  }

  try {
    const keywords = await loadKeywords();
    const now = new Date().toISOString();
    const automation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `kw_${Date.now()}`,
      keyword: keyword.trim(),
      responseDm: typeof responseDm === 'string' ? responseDm : '',
      responsePublic: typeof responsePublic === 'string' ? responsePublic : '',
      instagramMediaId: instagramMediaId.trim(),
      createdAt: now,
      updatedAt: now
    };

    keywords.push(automation);
    await writeJson(KEYWORDS_FILE, keywords);

    res.status(201).json(automation);
  } catch (error) {
    logError('Failed to create keyword automation', error);
    res.status(500).json({ error: 'Failed to create keyword automation' });
  }
});

router.put('/keywords/:id', async (req, res) => {
  const { id } = req.params;
  const { keyword, instagramMediaId, responseDm, responsePublic } = req.body || {};

  try {
    const keywords = await loadKeywords();
    const index = keywords.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Keyword automation not found' });
      return;
    }

    if (keyword !== undefined) {
      if (!keyword || typeof keyword !== 'string') {
        res.status(400).json({ error: 'keyword must be a non-empty string' });
        return;
      }
      keywords[index].keyword = keyword.trim();
    }

    if (instagramMediaId !== undefined) {
      if (!instagramMediaId || typeof instagramMediaId !== 'string') {
        res.status(400).json({ error: 'instagramMediaId must be a non-empty string' });
        return;
      }
      keywords[index].instagramMediaId = instagramMediaId.trim();
    }

    if (responseDm !== undefined) {
      keywords[index].responseDm = typeof responseDm === 'string' ? responseDm : '';
    }

    if (responsePublic !== undefined) {
      keywords[index].responsePublic = typeof responsePublic === 'string' ? responsePublic : '';
    }

    keywords[index].updatedAt = new Date().toISOString();

    await writeJson(KEYWORDS_FILE, keywords);
    res.json(keywords[index]);
  } catch (error) {
    logError('Failed to update keyword automation', error, { id });
    res.status(500).json({ error: 'Failed to update keyword automation' });
  }
});

router.delete('/keywords/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const keywords = await loadKeywords();
    const filtered = keywords.filter((item) => item.id !== id);

    if (filtered.length === keywords.length) {
      res.status(404).json({ error: 'Keyword automation not found' });
      return;
    }

    await writeJson(KEYWORDS_FILE, filtered);
    res.json({ deleted: true });
  } catch (error) {
    logError('Failed to delete keyword automation', error, { id });
    res.status(500).json({ error: 'Failed to delete keyword automation' });
  }
});

router.get('/instagram/posts', async (_req, res) => {
  try {
    const posts = await getCachedMedia();
    res.json(posts);
  } catch (error) {
    logError('Failed to load Instagram posts', error);
    res.status(500).json({ error: 'Failed to load Instagram posts' });
  }
});

module.exports = router;
