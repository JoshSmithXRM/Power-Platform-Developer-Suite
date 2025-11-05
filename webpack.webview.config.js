const path = require('path');
const webpack = require('webpack');

/**@type {(env: any, argv: any) => import('webpack').Configuration}*/
module.exports = (env, argv) => {
	const isProduction = argv.mode === 'production';

	return {
		target: 'web', // Webviews run in browser context
		mode: argv.mode || 'none', // Set to 'production' when packaging

		entry: {
			// Add webview behavior entry points here
			// WebviewLogger is imported as a dependency, not a separate entry
			EnvironmentSetupBehavior: './resources/webview/js/behaviors/EnvironmentSetupBehavior.js',
			DataTableBehavior: './resources/webview/js/behaviors/DataTableBehavior.js'
		},

		output: {
			path: path.resolve(__dirname, 'dist/webview'),
			filename: '[name].js'
			// No library export needed - webview scripts execute directly
		},

		plugins: [
			new webpack.DefinePlugin({
				// Inject DEV_MODE at build time
				// true in development, false in production
				'DEV_MODE': JSON.stringify(!isProduction)
			})
		],

		resolve: {
			extensions: ['.js']
		},

		devtool: 'nosources-source-map',

		infrastructureLogging: {
			level: 'log'
		}
	};
};
