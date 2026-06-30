// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Note: api.ts calls http://localhost:8000 directly (an absolute URL),
    // so these proxy rules aren't actually exercised — CORS is instead
    // handled by FastAPI's CORSMiddleware in main.py. Kept here in case
    // you switch api.ts to relative URLs later.
    proxy: {
      "/ask": "http://localhost:8000",
      "/documents": "http://localhost:8000",
      "/stats": "http://localhost:8000",
      "/auth": "http://localhost:8000",
      "/admin": "http://localhost:8000",
    },
  },
});
