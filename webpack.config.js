const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // VS Code extensions run in a Node.js-context
    mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/concepts/entry-points/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/concepts/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
        // modules added here also need to be added in the .vscodeignore file
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js'] // Allow .js imports to resolve to .ts files (required for TypeScript ESM)
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/, /Old/, /\.test\.ts$/, /\.spec\.ts$/],
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.build.json'
                        }
                    }
                ]
            }
        ]
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: "log", // enables logging required for problem matchers
    },
    // Disable code splitting - VS Code extensions should be a single bundle
    // This prevents numbered chunk files (1.extension.js, 2.extension.js, etc.)
    optimization: {
        splitChunks: false,
        runtimeChunk: false
    },
    plugins: [
        // Force all dynamic imports into the main bundle
        // This ensures the extension is a single file for faster loading
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ]
};
module.exports = config;
