const express = require("express");
const path = require("path");
const { createRequestHandler } = require("@remix-run/node");

const app = express();

app.use(express.static("public"));

app.all("*", (req, res, next) => {
  const handler = createRequestHandler({
    build: require("../build"),
    mode: process.env.NODE_ENV,
  });
  return handler(req, res, next);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Remix server listening on port", port);
});
