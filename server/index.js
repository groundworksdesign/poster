const express = require("express");
const path = require("path");

const app = express();

// Serve static files from /public by default
app.use(express.static("public"));

// Try to load Remix's request handler; prefer vendorized stub if present, otherwise try installed package.
let createRequestHandler;
try {
  try {
    // Prefer a local vendorized runtime when present
    // eslint-disable-next-line global-require
    createRequestHandler = require("../vendor/@remix-run/node").createRequestHandler;
    console.log("Using vendorized @remix-run/node stub");
  } catch (e) {
    // eslint-disable-next-line global-require
    createRequestHandler = require("@remix-run/node").createRequestHandler;
  }
} catch (err) {
  console.warn("@remix-run/node not found — falling back to static SPA server. Install remix and @remix-run/node to enable full Remix server behavior.");
}

if (createRequestHandler) {
  app.all("*", (req, res, next) => {
    // If a real Remix build exists at ../build use it, otherwise the vendor stub will ignore the build and serve index.html.
    let build;
    try {
      build = require("../build");
    } catch (e) {
      build = undefined;
    }

    const handler = createRequestHandler({
      build,
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
