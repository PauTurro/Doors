const path = require('path');

module.exports = {
  entry: './src/app.js', // Make sure this path is correct for your main JavaScript file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Optional: Cleans the output directory before each build
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Ensures compatibility with ES6+ JavaScript
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  mode: 'production', // Optimizes the bundle for production
  optimization: {
    minimize: true, // Minifies the output for smaller bundle size
  },
  devtool: 'source-map', // Optional: Adds source maps for debugging in production
};
