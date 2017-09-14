const webpack = require('webpack');
const baseConfig = require('./webpack.config');

module.exports = {
  ...baseConfig,
  devtool: 'none',
  plugins: [
    new webpack.optimize.UglifyJsPlugin({compress: true})
  ]
};
