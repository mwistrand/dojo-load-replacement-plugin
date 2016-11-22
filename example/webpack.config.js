const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const RequirePlugin = require('umd-compat-webpack-plugin');
const DojoLoadReplacementPlugin = require('../dist/umd/main').default;
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const basePath = process.cwd();

module.exports = {
	entry: {
		'src/main': [ './src/main.ts' ],
		'src/lazy': [ './src/renderMessage.ts' ]
	},
	output: {
		filename: 'main.js',
		path: path.join(__dirname, 'dist')
	},
	module: {
		loaders: [
			{ test: /\.ts$/, loader: 'ts-loader', exclude: './node_modules' }
		]
	},
	resolve: {
		root: [ basePath ],
		extensions: [ '', 'js', 'ts' ]
	},
	plugins: [
		new RequirePlugin(),
		new CommonsChunkPlugin('lazy', './dist/lazy.js'),
		new DojoLoadReplacementPlugin({
			context: [
				/node_modules\/dojo\-/,
				path.join(basePath, 'src')
			],
			resource: /dojo-core\/load/
		}),
		new HtmlWebpackPlugin({
			title: 'dojo-core/load replacement plugin example'
		})
	]
};
