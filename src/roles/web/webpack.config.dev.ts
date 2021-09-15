import * as path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { base, basePlugins } from "./webpack.base";
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
    ...base,
    mode: "development",
    devtool: "source-map",
    devServer: {
        historyApiFallback: true,
        contentBase: "./dist/web/",
        proxy: {
            "/api": "http://localhost:8000",
        },
    },
    plugins: [
        ...basePlugins,
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "./src/roles/web/index.template.html",
        }),
        /*
        new BundleAnalyzerPlugin({
            analyzerMode: "server",
            generateStatsFile: true,
            statsOptions: { source: false },
          }),
        //*/
    ],
    output: {
        filename: "[name].bundle.js",
        path: path.resolve("dist/web/built"),
        publicPath: "/",
    },
};
