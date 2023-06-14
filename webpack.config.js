const path = require('path')
const { HotModuleReplacementPlugin, EnvironmentPlugin } = require('webpack')
const HTMLWebpackPlugin = require('html-webpack-plugin')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const Dotenv = require('dotenv-webpack')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const CopyPlugin = require('copy-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

// Files in the `/public` directory that will be copied to `/dist during build
const includedFiles = [
  'favicon-light.ico',
  'favicon-dark.ico',
  'stackoverflow-light.css',
  'stackoverflow-dark.css'
]

/**
 * @param {*} env
 * @returns {import('webpack').Configuration}
 */
module.exports = env => {
  const plugins = [
    // psd.js uses node modules that can't just be replaced with an empty object
    // so those modules need to be pollyfilled
    new NodePolyfillPlugin({
      excludeAliases: ['console']
    }),
    new Dotenv({
      systemvars: true
    }),
    new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx']
    }),
    new HotModuleReplacementPlugin(),
    new MonacoWebpackPlugin({
      features: [
        '!contextmenu',
        '!codeAction',
        '!codelens',
        '!gotoError',
        '!indentation',
        '!parameterHints',
        '!rename',
        '!suggest'
      ]
    }),
    new HTMLWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html')
    }),
    new CopyPlugin(
      includedFiles.map(filename => ({
        from: path.resolve(__dirname, 'public', filename),
        to: path.resolve(__dirname, 'dist')
      }))
    ),
    new EnvironmentPlugin({
      DEBUG: (env.debug===undefined)? false: JSON.parse(env.debug)
    })
  ]

  if (env.analyze) {
    plugins.push(new BundleAnalyzerPlugin())
  }

  return {
    plugins,
    mode: 'development',
    entry: './src/index.tsx',
    output: {
      //path: path.resolve(__dirname, 'dist'), //default
      //filename: '[name].js', //default
      publicPath: '/',
      clean: true, // in place of `clean-webpack-plugin`
    },
    devServer: {
      //static: ['public'], //default
      open: false, // don't open new browser every time
      client: {
        logging: 'log',//'log','info','warn','error','none','verbose',
        progress: true,
      },
      port: 9000,
      host: '0.0.0.0',//'local-ip',//'0.0.0.0',
      devMiddleware: {
        writeToDisk: true,
      },
      hot: true,
      allowedHosts: 'all', // [v5] allowedHosts:'all' == [v4] disableHostCheck:true
      // Allows any url to be visited without throwing a 404 in dev mode
      historyApiFallback: {
        index: '/',
        disableDotRule: true,
      },
    },
    //devtool: 'source-map', // generate source maps for DevTools; See `source-map-loader` for loading existing source maps.
    module: {
      rules: [
        {
          test: /\.(ts|js)x?$/,
          include: path.resolve(__dirname, 'src'),
          exclude: /node_modules/,
          use: ['babel-loader'],
        },
        {// load existing source maps for DevTools
          test: /\.(ts|js)x?$/,
          exclude: /node_modules\/@firebase\/auth/,
          use: ['source-map-loader',],
        },
        {
          test: /\.(ttf|png|jpg|svg|ico)$/,
          type: 'asset/resource',
        },
        {
          test: /\.(css|scss)$/,
          use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader',],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      // wabt.js uses fs and other modules from node which aren't available in the browser
      // so they need to be replaced with an empty object. HOWEVER: this may
      // mean that some functions of the library may not work properly
      // https://webpack.js.org/configuration/resolve/#resolvefallback
      // https://github.com/AssemblyScript/wabt.js/issues/21#issuecomment-790203740
      fallback: {
        fs: false
      }
    }
  }
}
