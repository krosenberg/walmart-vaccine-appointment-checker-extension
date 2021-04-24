module.exports = {
  mode: "production",
  entry: {
    content: "./src/index.jsx",
  },
  output: {
    filename: "[name].js",
    path: __dirname + "/dist",
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [["@babel/plugin-transform-react-jsx", { pragma: "h" }]],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "resolve-url-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  optimization: {
    // We no not want to minimize our code.
    minimize: false,
  },
};
