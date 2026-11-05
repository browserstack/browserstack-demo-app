module.exports = {
  // Emit .next/standalone: a self-contained server with only the traced runtime
  // dependencies, so the production image (browserstack-docker
  // browserstack-demo-app/Dockerfile) does not carry the build toolchain.
  output: 'standalone',
  // /api/doc (next-swagger-doc) reads the JSDoc in pages/api at runtime.
  outputFileTracingIncludes: {
    '/api/doc': ['./pages/api/**/*'],
  },
  turbopack: {
    root: __dirname
  },
  sassOptions: {
    // The SCSS uses @import and global functions; keep the build output readable.
    silenceDeprecations: ['import', 'global-builtin', 'slash-div', 'color-functions']
  }
};
