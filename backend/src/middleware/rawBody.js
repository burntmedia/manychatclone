const express = require('express');

// Middleware builder that captures the raw JSON payload while still parsing it
// so downstream handlers can inspect the untouched body for debugging.
function jsonWithRawBody(options = {}) {
  return express.json({
    limit: options.limit || '2mb',
    verify: (req, _res, buf) => {
      // Store raw body as a UTF-8 string for diagnostics and signature validation.
      req.rawBody = buf?.length ? buf.toString('utf8') : '';
    }
  });
}

module.exports = { jsonWithRawBody };
