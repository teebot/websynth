module.exports = {
  entry: './src/index.ts',
  devtool: 'source-map',
  output: {
    filename: 'out/main.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {test: /\.tsx?$/, loader: 'ts-loader'}
    ]
  }
};
