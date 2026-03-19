import React from 'react';

// Minimal Remix root scaffold for future migration
export default function Root() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Poster (Remix scaffold)</title>
      </head>
      <body>
        <div id="app-root">
          <h1>Poster Remix scaffold</h1>
          <p>This folder contains ported route components: <code>/routes/deck</code> and <code>/routes/presentation</code>.</p>
        </div>
      </body>
    </html>
  );
}
