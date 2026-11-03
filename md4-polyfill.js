// webpack 4 (used by Next 10) hashes modules and assets with MD4, which OpenSSL 3
// (Node 17+) no longer exposes by default. When native MD4 is unavailable, route
// crypto.createHash('md4') to a pure-JS MD4 so digests, chunk names and asset names
// stay identical to builds made on older Node versions.
const crypto = require('crypto');
const md4 = require('js-md4');

class Md4Hash {
  constructor() {
    this.hash = md4.create();
  }

  update(data, encoding) {
    this.hash.update(typeof data === 'string' ? Buffer.from(data, encoding || 'utf8') : data);
    return this;
  }

  digest(encoding) {
    const buffer = Buffer.from(this.hash.arrayBuffer());
    return encoding ? buffer.toString(encoding) : buffer;
  }
}

const hasNativeMd4 = () => {
  try {
    crypto.createHash('md4');
    return true;
  } catch (e) {
    return false;
  }
};

if (!hasNativeMd4()) {
  const createHash = crypto.createHash;
  crypto.createHash = function (algorithm, options) {
    if (typeof algorithm === 'string' && algorithm.toLowerCase() === 'md4') {
      return new Md4Hash();
    }
    return createHash.call(this, algorithm, options);
  };
}
