import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === "production",
        dead_code: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/three/")) {
            return "three";
          }
          if (id.includes("node_modules/dat.gui/")) {
            return "dat.gui";
          }
        },
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split(".").at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = "img";
          } else if (/fbx|gltf|glb/i.test(extType)) {
            extType = "models";
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
    assetsDir: "assets",
    sourcemap: process.env.NODE_ENV !== "production",
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ["three", "dat.gui"],
    exclude: [],
  },
  resolve: {
    alias: {
      three: "three",
      "@": "/js",
    },
  },
  base: "./",
});
