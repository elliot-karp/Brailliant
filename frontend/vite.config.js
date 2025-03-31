import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      host: '10.0.0.63',
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  }
});
