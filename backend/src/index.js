const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { handleVerification, handleWebhook } = require('./controllers/webhook');
const { listKeywords, saveKeyword } = require('./controllers/keywords');
const { getReplies, updateReplies } = require('./controllers/replies');
const { getStatus } = require('./controllers/status');
const { listLogs } = require('./controllers/logs');
const { loadEnv } = require('./utils/env');
const { log } = require('./utils/logger');

loadEnv();

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = normalizePath(parsedUrl.pathname);

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'GET' && pathname === '/webhook') {
    handleVerification(req, res, parsedUrl.query);
    return;
  }

  if (req.method === 'POST' && pathname === '/webhook') {
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

  if (req.method === 'GET' && pathname === '/api/keywords') {
    listKeywords(res);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/replies') {
    getReplies(res);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/replies') {
    try {
      const body = await readBody(req);
      updateReplies(body, res);
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/status') {
    getStatus(res);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/logs') {
    listLogs(res);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/keywords') {
    try {
      const body = await readBody(req);
      saveKeyword(body, res);
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (req.method === 'GET' && (pathname === '/' || pathname.startsWith('/assets/'))) {
    return serveStatic(pathname, res);
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

function normalizePath(pathname = '/') {
  if (!pathname) return '/';
  const stripped = pathname.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
}

function serveStatic(pathname, res) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}
