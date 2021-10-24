import * as path from "path";
import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";


export const basePlugins = [
    new CopyPlugin({
        patterns: [
            { from: "./src/roles/web/assets", to: "./assets" },
        ],
    }),
];

export const base = {
    mode: "development",
    entry: {
        index: "./src/roles/web/js/app.tsx",
    },
    module: {
        rules: [
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                },
            },
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules|common-backend|src\/roles\/spooler|src\/roles\/worker|src\/roles\/api/,
            },
            {
                test: /\.css?$/,
                use: [
                    "style-loader",
                    "css-loader",
                ],
            },
            {
                test: /\.(png|jpg|jpeg|gif)$/i,
                type: 'asset/resource'
              },
            { test: /\.m?js/, type: "javascript/auto" }
        ],
    },
    optimization: {
        splitChunks: {
            chunks: "async",
            minSize: 20000,
            minRemainingSize: 0,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            enforceSizeThreshold: 50000,
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    reuseExistingChunk: true,
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                },
            },
        },
    },

    plugins: basePlugins,
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve("dist/web/built"),
        publicPath: "/",
    },
};
