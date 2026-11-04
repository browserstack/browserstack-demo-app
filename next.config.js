module.exports = {
  turbopack: {
    root: __dirname
  },
  sassOptions: {
    // The SCSS uses @import and global functions; keep the build output readable.
    silenceDeprecations: ['import', 'global-builtin', 'slash-div', 'color-functions']
  }
};
