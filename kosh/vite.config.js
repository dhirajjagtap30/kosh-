import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// npm run dev -> browser opens automatically; host:true lets you test on your phone (same Wi-Fi)
export default defineConfig({
  plugins: [react()],
  server: { open: true, host: true, port: 5173 },
  preview: { open: true, host: true },
});
