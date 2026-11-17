const crypto = require('crypto');
const config = require('./config');

// Proves an Authorization header arrived without writing the credential to the log:
// scheme, length and a short hash are enough to match it against what the script sent.
const describeAuth = (header) => {
  if (!header) return null;
  const [scheme] = String(header).split(' ');
  const hash = crypto.createHash('sha256').update(String(header)).digest('hex').slice(0, 12);
  return { scheme, length: String(header).length, sha256: hash };
};

const log = (event, fields = {}) => {
  if (!config.logRequests) return;
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...fields })}\n`);
};

module.exports = { log, describeAuth };
