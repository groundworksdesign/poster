/**
 * Basic Remix config scaffold for migration.
 * Note: dependencies (remix, @remix-run/*) must be installed before running the build.
 */
/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: "app",
  serverBuildTarget: "node-cjs",
  devServerPort: 8002,
  ignoredRouteFiles: ["**/.*"]
};
