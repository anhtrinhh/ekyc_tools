const path = require("path");

module.exports = {
    // bundling mode
    mode: "production",
    // entry files
    entry: "./src/index.ts",
    // output bundles (location)
    output: {
        path: path.resolve( __dirname, "dist" ),
        filename: "ekyc-tools.min.js",
        library: "__EkycToolsLibrary__",
    },
    // file resolutions
    resolve: {
        extensions: [ ".ts", ".js" ],
    },
    target: "web",
    module: {
        rules: [
            {
                test: /\.tsx?/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ]
    },
    optimization: {
        minimize: true,
        usedExports: true
    }
};