const { readAutomations, saveAutomations } = require('../services/automations');

function getReplies(res) {
  const payload = readAutomations();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function updateReplies(body, res) {
  const next = saveAutomations({
    commentReplies: Array.isArray(body.commentReplies) ? body.commentReplies : undefined,
    dmReplies: Array.isArray(body.dmReplies) ? body.dmReplies : undefined,
    resourceUrl: typeof body.resourceUrl === 'string' ? body.resourceUrl : undefined
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(next));
}

module.exports = {
  getReplies,
  updateReplies
};
