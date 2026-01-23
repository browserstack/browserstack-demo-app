const optimizedImages = require('next-optimized-images');
const withPlugins = require('next-compose-plugins');
const webpack = require('webpack');

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
  [optimizedImages, optimizedImagesConfig],
], nextConfiguration);
