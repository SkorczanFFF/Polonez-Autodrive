import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base: the same build works on Vercel (/) and GitHub Pages (/Polonez-Autodrive/).
  base: "./",
  build: {
    target: "es2022",
    // three.js alone is ~700 kB minified; one chunk is fine for this app.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    setupFiles: ["./vitest.setup.js"],
  },
});
