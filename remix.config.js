/**
 * Basic Remix config scaffold for migration.
 * Note: dependencies (remix, @remix-run/*) must be installed before running the build.
 */
/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: "app",
  ignoredRouteFiles: ["**/.*"],
  // Replace the removed `serverBuildTarget: "node-cjs"` with explicit options.
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  future: {
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
    v2_meta: true,
    v2_headers: true,
    v2_routeConvention: true,
    // `v2_dev` replaces the removed `devServerPort` option; pass the port here.
    v2_dev: {
      // Avoid clashing with other local Remix / tools that bind :8002.
      port: Number(process.env.REMIX_DEV_WS_PORT || 8022),
    },
  },
};
