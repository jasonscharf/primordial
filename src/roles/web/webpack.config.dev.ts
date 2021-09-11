import * as path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { base, basePlugins } from "./webpack.base";


module.exports = {
    ...base,
    mode: "development",
    devtool: "inline-source-map",
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
            title: "Development",
        }),
    ],
    output: {
        filename: "[name].bundle.js",
        path: path.resolve("dist/web/built"),
    },
};
