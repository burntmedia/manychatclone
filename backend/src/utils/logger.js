function serializeMeta(meta) {
  if (!meta) return undefined;
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch (_e) {
    return String(meta);
  }
}

function log(message, meta = {}) {
  const payload = { ts: new Date().toISOString(), level: 'info', message, meta: serializeMeta(meta) };
  console.log(JSON.stringify(payload));
}

function logError(message, error, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level: 'error',
    message,
    error: error?.message,
    stack: error?.stack,
    meta: serializeMeta(meta)
  };
  console.error(JSON.stringify(payload));
}

module.exports = { log, logError };
