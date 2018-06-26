const path = require('path')

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader'
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
        exclude: '/node_modules/'
      }
    ]
  },
  devtool: 'source-map',
  resolve: {
    extensions: [ '.ts', '.js', '.tsx', '.jsx' ]
  },
  output: {
    path: path.join(__dirname, 'dist'),
    library: "index",
    libraryTarget: "commonjs2",
    filename: "index.js"
  }
}
