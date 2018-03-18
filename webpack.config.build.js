const webpack = require('webpack');
const baseConfig = require('./webpack.config');

module.exports = Object.assign(baseConfig, {
  devtool: 'none',
  optimization: {
    minimize: true
  }
});
