const { loadEnv } = require('../utils/env');
const { readAutomations } = require('../services/automations');
const { readLogs } = require('../services/logStore');

function getStatus(res) {
  loadEnv();
  const env = process.env;
  const webhookUrl = env.SERVER_URL ? `${env.SERVER_URL.replace(/\/+$/, '')}/webhook` : null;

  const payload = {
    webhook: {
      callbackUrl: webhookUrl,
      verifyTokenSet: Boolean(env.VERIFY_TOKEN),
      serverHealthy: true
    },
    instagram: {
      instagramBusinessId: env.INSTAGRAM_BUSINESS_ID || '',
      pageId: env.PAGE_ID || '',
      pageAccessTokenSet: Boolean(env.PAGE_ACCESS_TOKEN)
    },
    automations: readAutomations(),
    logsAvailable: readLogs().length
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = {
  getStatus
};
