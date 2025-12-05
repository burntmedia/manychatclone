const express = require('express');
const { handleVerification, handleWebhook } = require('./controllers/webhook');
const { handleLoginRedirect, handleAuthCallback } = require('./controllers/auth');
const { loadEnv } = require('./utils/env');
const { log } = require('./utils/logger');
const { readJson, writeJson } = require('./utils/jsonStore');

loadEnv();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/webhook', (req, res) => {
  handleVerification(req, res, req.query);
});

app.post('/webhook', async (req, res) => {
  try {
    await handleWebhook(req.body || {});
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/auth/login', async (req, res) => {
  await handleLoginRedirect(req, res);
});

app.get('/auth/callback', async (req, res) => {
  await handleAuthCallback(req, res, req.query);
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await readJson('posts.json', []);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

app.get('/keywords', async (req, res) => {
  try {
    const keywords = await readJson('keywords.json', []);
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load keywords' });
  }
});

app.post('/keywords', async (req, res) => {
  const keyword = (req.body?.keyword || '').trim();
  if (!keyword) {
    res.status(400).json({ error: 'Keyword is required' });
    return;
  }

  try {
    const keywords = await readJson('keywords.json', []);
    if (!keywords.includes(keyword)) {
      keywords.push(keyword);
      await writeJson('keywords.json', keywords);
    }

    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save keyword' });
  }
});

app.delete('/keywords/:keyword', async (req, res) => {
  const keyword = (req.params.keyword || '').trim();
  if (!keyword) {
    res.status(400).json({ error: 'Keyword is required' });
    return;
  }

  try {
    const keywords = await readJson('keywords.json', []);
    const filtered = keywords.filter((k) => k !== keyword);
    if (filtered.length !== keywords.length) {
      await writeJson('keywords.json', filtered);
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete keyword' });
  }
});

app.get('/automations', async (req, res) => {
  try {
    const automations = await readJson('automations.json', []);
    res.json(automations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load automations' });
  }
});

app.post('/automations', async (req, res) => {
  const trigger = (req.body?.trigger || '').trim();
  const response = (req.body?.response || '').trim();

  if (!trigger || !response) {
    res.status(400).json({ error: 'Trigger and response are required' });
    return;
  }

  try {
    const automations = await readJson('automations.json', []);
    const automation = {
      id: `auto_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      trigger,
      response,
    };

    automations.push(automation);
    await writeJson('automations.json', automations);

    res.json(automation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save automation' });
  }
});

app.post('/settings', async (req, res) => {
  const settings = req.body && typeof req.body === 'object' ? req.body : null;
  if (!settings) {
    res.status(400).json({ error: 'Settings object is required' });
    return;
  }

  try {
    await writeJson('settings.json', settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  log('Server listening', { port: PORT });
});
