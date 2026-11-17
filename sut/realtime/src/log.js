const crypto = require('crypto');
const config = require('./config');

const KNOWN_SCHEMES = new Set(['basic', 'bearer', 'digest', 'negotiate', 'ntlm', 'token', 'apikey', 'aws4-hmac-sha256']);

// Proves an Authorization header arrived without writing the credential to the log:
// scheme, length and a short hash are enough to match it against what the script sent.
// Only a known scheme followed by a credential is logged by name; a token-only header would
// otherwise put the whole credential in the scheme field.
const describeAuth = (header) => {
  if (!header) return null;
  const parts = String(header).trim().split(/\s+/);
  const scheme = parts.length > 1 && KNOWN_SCHEMES.has(parts[0].toLowerCase()) ? parts[0] : 'unknown';
  const hash = crypto.createHash('sha256').update(String(header)).digest('hex').slice(0, 12);
  return { scheme, length: String(header).length, sha256: hash };
};

const log = (event, fields = {}) => {
  if (!config.logRequests) return;
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...fields })}\n`);
};

module.exports = { log, describeAuth };
