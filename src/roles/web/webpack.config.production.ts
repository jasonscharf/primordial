import * as path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { base } from "./webpack.base";


module.exports = {
    ...base,
    mode: "production",
};
