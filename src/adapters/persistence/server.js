const express = require("express");
const path = require("path");
const { createRequestHandler } = require("@remix-run/express");
const { mountPosterSessionRelay } = require("../realtime/posterSessionRelay");

const app = express();

mountPosterSessionRelay(app);

// Serve hashed Remix client assets and other files from /public.
// `index: false` is required: otherwise `GET /` serves `public/index.html` (the CRA
// shell with an empty #root and no bundles) before Remix can SSR the app — a blank page.
app.use(express.static("public", { index: false }));

let build;
try {
  build = require("../../../build");
} catch (e) {
  build = undefined;
}

let remixHandler;
if (build) {
  remixHandler = createRequestHandler({
    build,
    mode: process.env.NODE_ENV,
  });
  app.all("*", remixHandler);
} else {
  let createStubHandler;
  try {
    // eslint-disable-next-line global-require
    createStubHandler = require("../../../vendor/@remix-run/node").createRequestHandler;
  } catch (e) {
    createStubHandler = null;
  }

  if (createStubHandler) {
    console.warn(
      "Remix build not found at ./build — using vendor stub (serves public/cra-index.html only). Run `pnpm run build:remix`.",
    );
    app.all("*", createStubHandler());
  } else {
    app.get("*", (req, res) => {
      const craIndex = path.join(__dirname, "..", "..", "..", "public", "cra-index.html");
      res.sendFile(craIndex, (err) => {
        if (err) {
          res.status(500).send("Server configuration incomplete: no Remix build and no CRA template.");
        }
      });
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server listening on port", port);
});
