const http = require('http');
const url = require('url');
const { handleVerification, handleWebhook } = require('./controllers/webhook');
const { handleLoginRedirect, handleAuthCallback } = require('./controllers/auth');
const { loadEnv } = require('./utils/env');
const { log } = require('./utils/logger');

loadEnv();

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/webhook') {
    handleVerification(req, res, parsedUrl.query);
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/webhook') {
    try {
      const body = await readBody(req);
      await handleWebhook(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/auth/login') {
    await handleLoginRedirect(req, res);
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/auth/callback') {
    await handleAuthCallback(req, res, parsedUrl.query);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  log('Server listening', { port: PORT });
});

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}
