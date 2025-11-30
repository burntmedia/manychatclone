function log(message, meta = {}) {
  const payload = { ts: new Date().toISOString(), message, ...meta };
  console.log(JSON.stringify(payload));
}

function logError(message, error, meta = {}) {
  const payload = { ts: new Date().toISOString(), message, error: error?.message, stack: error?.stack, ...meta };
  console.error(JSON.stringify(payload));
}

module.exports = { log, logError };
