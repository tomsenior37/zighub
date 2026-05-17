import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8282";

export default defineConfig({
  root: "src/web",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/health": API_TARGET,
      "/api": API_TARGET,
    },
  },
});
