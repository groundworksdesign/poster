import React from "react";
import type { LinksFunction, V2_MetaFunction } from "@remix-run/node";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import appStylesheet from "../src/App.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesheet },
];

export const meta: V2_MetaFunction = () => [
  { charset: "utf-8" },
  { title: "Poster" },
  { name: "viewport", content: "width=device-width,initial-scale=1" },
];

// Inline script applied before paint to restore saved theme and avoid FOUC.
export const themeInitScript = `(function(){try{var valid={light:1,dracula:1,'tokyo-night':1,'dark-blue':1,'github-dark':1};var saved=null;try{if(window.poster&&typeof window.poster.readThemeSync==='function'){saved=window.poster.readThemeSync();}}catch(e){}if(!valid[saved]){try{saved=localStorage.getItem('poster-theme');}catch(e){}}if(!valid[saved]||saved==='light')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=saved;}catch(e){delete document.documentElement.dataset.theme;}})();`;

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
