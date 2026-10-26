import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  // Relative base: the same build works on Vercel (/) and GitHub Pages (/Polonez-Autodrive/).
  base: "./",
  define: {
    // Vercel builds run with VERCEL=1; Web Analytics lives only there (GitHub Pages has no
    // /_vercel/insights).
    "import.meta.env.VERCEL": JSON.stringify(loadEnv(mode, ".", "VERCEL").VERCEL === "1"),
  },
  build: {
    target: "es2022",
    // three.js alone is ~700 kB minified; one chunk is fine for this app.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    setupFiles: ["./vitest.setup.js"],
  },
}));
