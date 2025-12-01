const { readLogs } = require('../services/logStore');

function listLogs(res) {
  const payload = readLogs();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = {
  listLogs
};
