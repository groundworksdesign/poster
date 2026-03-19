const express = require("express");
const path = require("path");

const app = express();

// Serve static files from /public by default
app.use(express.static("public"));

// Try to load Remix's request handler; if unavailable, fall back to a simple static SPA handler.
let createRequestHandler;
try {
  // eslint-disable-next-line global-require
  createRequestHandler = require("@remix-run/node").createRequestHandler;
} catch (err) {
  console.warn("@remix-run/node not found — falling back to static SPA server. Install remix and @remix-run/node to enable full Remix server behavior.");
}

if (createRequestHandler) {
  app.all("*", (req, res, next) => {
    const handler = createRequestHandler({
      build: require("../build"),
      mode: process.env.NODE_ENV,
    });
    return handler(req, res, next);
  });
} else {
  // Serve index.html for all routes as a fallback for SPA behavior (useful when remix packages are not installed)
  app.get("*", (req, res) => {
    const indexPath = path.join(__dirname, "..", "public", "index.html");
    res.sendFile(indexPath, err => {
      if (err) {
        res.status(500).send("Server configuration incomplete: Remix server unavailable and public/index.html not found.");
      }
    });
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server listening on port", port);
});
