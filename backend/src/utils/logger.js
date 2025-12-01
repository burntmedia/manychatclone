function log(message, meta = {}) {
  const payload = { ts: new Date().toISOString(), message, ...meta };
  try {
    const { addLog } = require('../services/logStore');
    addLog(payload);
  } catch (_) {
    // noop if log store is unavailable
  }
  console.log(JSON.stringify(payload));
}

function logError(message, error, meta = {}) {
  const payload = { ts: new Date().toISOString(), message, error: error?.message, stack: error?.stack, ...meta };
  try {
    const { addLog } = require('../services/logStore');
    addLog(payload);
  } catch (_) {
    // noop if log store is unavailable
  }
  console.error(JSON.stringify(payload));
}

module.exports = { log, logError };
