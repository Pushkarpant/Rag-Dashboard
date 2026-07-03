// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/ask":           "http://localhost:8000",
      "/documents":     "http://localhost:8000",
      "/stats":         "http://localhost:8000",
      "/auth":          "http://localhost:8000",
      "/admin":         "http://localhost:8000",
      "/conversations": "http://localhost:8000",
    },
  },
});
