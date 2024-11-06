const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = {
    devtool: '#source-map',
    entry: ['babel-polyfill', './src/index.js'],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                }
            },
            {
              test: /\.html$/,
              use: [
                {
                  loader: "html-loader"
                }
              ]
            },
            {
              test: /\.css$/,
              use: ['style-loader','css-loader', {
                  loader: 'postcss-loader',
                  options: {
                    plugins: () => [require('autoprefixer')]
                  }
                }
              ]
            },
            {
              test: /\.scss/,
              use: ['style-loader','css-loader', {
                  loader: 'postcss-loader',
                  options: {
                    plugins: () => [require('autoprefixer')]
                  }}, 'sass-loader']
            },
            { 
              test: /\.(png|jpg)$/,
              loader: 'file-loader' 
            }
        ]
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: "./src/index.html",
        filename: "./index.html"
      })
    ]
}