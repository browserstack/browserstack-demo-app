/** @type {import('next').NextConfig} */
module.exports = {
  // Emit .next/standalone: a self-contained server with only the traced runtime
  // dependencies, so the production image does not carry the build toolchain.
  output: 'standalone',
  // The swagger route reads the JSDoc in pages/api at runtime.
  outputFileTracingIncludes: {
    '/api/doc': ['./pages/api/**/*'],
  },
};
