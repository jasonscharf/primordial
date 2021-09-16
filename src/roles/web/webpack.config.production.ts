import * as path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { base, basePlugins } from "./webpack.base";


module.exports = {
    ...base,
    mode: "production",
    plugins: [
        ...basePlugins,
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "./src/roles/web/index.template.html",
          }),
    ],
    output: {
        filename: "[name].bundle.js",
        path: path.resolve("dist/web/built"),
        publicPath: "/",
    },
};
