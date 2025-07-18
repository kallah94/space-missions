const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'space-missions.min.js',
        library: 'SpaceMissions',
        libraryTarget: 'umd',
        clean: true,
        globalObject: 'this'
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './examples/basic/index.html',
            filename: 'index.html'
        })
    ],
    devServer: {
        static: './dist',
        port: 8080,
        open: true,
        hot: true
    },
    externals: {
        three: 'THREE'
    },
    devtool: 'source-map'
};