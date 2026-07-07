// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// NOTE: No dev proxy here, on purpose.
// The frontend talks to the API by its absolute URL (services/api.ts →
// BASE = "http://localhost:8000"), and the backend already allows CORS from any
// origin. The old proxy matched "/admin", which hijacked browser *page*
// navigations: a hard refresh while on the /admin route forwarded the HTML
// request to FastAPI (which returns JSON), so the SPA never loaded and the page
// appeared to crash. With no proxy, Vite serves index.html for every route, so
// refreshing /admin (or any future client route) works.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
