import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0" },
  build: {
    target: "es2020",
    // three.js is large and changes rarely; its own chunk caches well.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
