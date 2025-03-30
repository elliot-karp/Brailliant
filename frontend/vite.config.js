import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    host: true, // this sets host to 0.0.0.0, allowing LAN access
    port: 5173, // optional: make sure it's the port you're using
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  }
});
