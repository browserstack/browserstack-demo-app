const optimizedImages = require('next-optimized-images');
const withStyles = require('@webdeb/next-styles')
const withPlugins = require('next-compose-plugins');
const webpack = require('webpack');

const sassConfig = {
  sass: true, // use .scss files
  modules: true // style.(m|module).css & style.(m|module).scss for module files
}

const optimizedImagesConfig = {
  inlineImageLimit: 8192,
  imagesFolder: 'images',
  imagesName: '[name]-[hash].[ext]',
  optimizeImagesInDev: false,
  mozjpeg: {
    quality: 80
  },
  optipng: {
    optimizationLevel: 3
  },
  pngquant: false,
  gifsicle: {
    interlaced: true,
    optimizationLevel: 3
  },
  svgo: {
    // enable/disable svgo plugins here
  },
  webp: {
    preset: 'default',
    quality: 75
  }
};

const nextConfiguration = {
  webpack: config => {
    config.plugins.push(
      new webpack.DefinePlugin({
        PC: JSON.stringify('pc')
      })
    );
    return config;
  },
};

module.exports = withPlugins([
  [withStyles, sassConfig],
  [optimizedImages, optimizedImagesConfig],
], nextConfiguration);
