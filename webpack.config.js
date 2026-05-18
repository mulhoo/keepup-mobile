const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

const appDirectory = path.resolve(__dirname);

const babelLoaderConfig = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.tsx'),
    path.resolve(appDirectory, 'src'),
    path.resolve(appDirectory, 'node_modules/react-native'),
    path.resolve(appDirectory, 'node_modules/react-native-web'),
    path.resolve(appDirectory, 'node_modules/@react-navigation'),
    path.resolve(appDirectory, 'node_modules/@react-native'),
    path.resolve(appDirectory, 'node_modules/react-native-screens'),
    path.resolve(appDirectory, 'node_modules/react-native-safe-area-context'),
    path.resolve(appDirectory, 'node_modules/@react-native-async-storage'),
    path.resolve(appDirectory, 'node_modules/@react-navigation/stack'),
    path.resolve(appDirectory, 'node_modules/react-native-gesture-handler'),
    path.resolve(appDirectory, 'node_modules/react-native-reanimated'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
      configFile: false,
      babelrc: false,
      presets: [
        ['@babel/preset-env', {targets: {browsers: ['last 2 versions']}}],
        ['@babel/preset-react', {runtime: 'automatic'}],
        ['@babel/preset-typescript', {allowDeclareFields: true}],
      ],
      plugins: [
        ['@babel/plugin-transform-class-properties', {loose: true}],
        ['@babel/plugin-transform-private-methods', {loose: true}],
        ['@babel/plugin-transform-private-property-in-object', {loose: true}],
      ],
    },
  },
};

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.js'),
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(appDirectory, 'web-build'),
    publicPath: '/',
  },
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true,
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-linear-gradient': path.resolve(appDirectory, 'src/web/LinearGradientWeb.tsx'),
      'react-native-change-icon': path.resolve(appDirectory, 'src/web/NoopModule.ts'),
      '@env': path.resolve(appDirectory, 'src/web/EnvWeb.ts'),
      '@react-native-async-storage/async-storage': path.resolve(appDirectory, 'src/web/AsyncStorageWeb.ts'),
      'react-native-screens': path.resolve(appDirectory, 'src/web/NoopModule.ts'),
      'react-native-safe-area-context': path.resolve(appDirectory, 'src/web/SafeAreaWeb.tsx'),
      'react-native-gesture-handler': path.resolve(appDirectory, 'src/web/GestureHandlerWeb.tsx'),
      'react-native-reanimated': path.resolve(appDirectory, 'src/web/NoopModule.ts'),
      'react-native-worklets': path.resolve(appDirectory, 'src/web/NoopModule.ts'),
      '@react-navigation/native': path.resolve(appDirectory, 'src/web/ReactNavigationNativeWeb.ts'),
    },
  },
  module: {
    rules: [
      babelLoaderConfig,
      {
        test: /\.m?js/,
        resolve: { fullySpecified: false },
        include: /node_modules\/(@react-navigation|@huggingface)/,
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 8192,
            esModule: false,
            fallback: {
              loader: 'file-loader',
              options: {esModule: false, name: '[contenthash].[ext]'},
            },
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'web/index.html'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || 'http://localhost:3000'),
      'process.env.API_TIMEOUT': JSON.stringify(process.env.API_TIMEOUT || '90000'),
    }),
  ],
  devServer: {
    port: 3001,
    historyApiFallback: true,
  },
};
