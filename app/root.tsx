import React from "react";
import type { V2_MetaFunction } from "@remix-run/node";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

export const meta: V2_MetaFunction = () => [
  { charset: "utf-8" },
  { title: "Poster" },
  { name: "viewport", content: "width=device-width,initial-scale=1" },
];

// Inline script applied before paint to restore saved theme and avoid FOUC.
const themeInitScript = `(function(){try{var t=localStorage.getItem('poster-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
