// Raw TCP listener that resets every connection the moment it is accepted. Gives the
// "refused" connection leg a fast, deterministic failure (connection reset) instead of a
// silent drop that would only end at the client's timeout.

const net = require('net');
const { log } = require('./log');

const createResetServer = () =>
  net.createServer((socket) => {
    socket.on('error', () => {});
    log('tcp_reset', { remote: socket.remoteAddress });
    socket.resetAndDestroy();
  });

module.exports = { createResetServer };
