const express = require('express');
const { handleVerification, handleWebhook } = require('./controllers/webhook');
const { handleLoginRedirect, handleAuthCallback, loadTokens } = require('./controllers/auth');
const apiRouter = require('./routes/api');
const { loadEnv } = require('./utils/env');
const { log } = require('./utils/logger');
const { readJson, writeJson } = require('./utils/jsonStore');
const { jsonWithRawBody } = require('./middleware/rawBody');

loadEnv();

const PORT = process.env.PORT || 3000;
const app = express();

// Allow cross-origin requests from the dashboard
const allowOrigin = process.env.DASHBOARD_ORIGIN || 'https://dashboard.burnt.media';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowOrigin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use((req, _res, next) => {
  log('Incoming request', { method: req.method, url: req.originalUrl, headers: req.headers });
  next();
});

app.use(jsonWithRawBody());

// Ensure malformed JSON bodies are logged and do not crash the server
app.use((err, req, res, next) => {
  if (err) {
    log('Request body parsing error', { error: err.message, rawBody: req.rawBody, url: req.originalUrl });
    if (req.path === '/webhook') {
      res.status(200).json({ received: true });
      return;
    }
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

app.get('/webhook', (req, res) => {
  handleVerification(req, res);
});

app.post('/webhook', async (req, res) => {
  await handleWebhook(req, res);
});

app.get('/debug', (req, res) => {
  const tokens = (() => {
    try {
      return loadTokens();
    } catch (_e) {
      return null;
    }
  })();

  log('Debug endpoint called', { tokensPresent: !!tokens, tokenKeys: tokens ? Object.keys(tokens) : [] });
  res.json({ status: 'OK', tokens: tokens ? Object.keys(tokens) : [] });
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

app.get('/logs', async (_req, res) => {
  try {
    const logs = await readJson('logs.json', []);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load logs' });
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

app.listen(PORT, '0.0.0.0', () => {
  log('Server listening', { port: PORT, host: '0.0.0.0' });
});

