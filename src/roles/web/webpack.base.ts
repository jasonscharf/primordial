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
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css?$/,
                use: [
                    "style-loader",
                    "css-loader"
                ],
            }
        ],
    },
    plugins: basePlugins,
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve("dist/web/built"),
        //clean: true,
    },
};
