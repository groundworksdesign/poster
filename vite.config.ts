import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Minimal Vite config for Remix migration. Install @vitejs/plugin-react and vite before use.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
});
