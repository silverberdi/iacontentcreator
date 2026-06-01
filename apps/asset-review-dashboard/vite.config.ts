import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/webhook": {
        target: "http://192.168.0.194:5678",
        changeOrigin: true,
      },
    },
  },
});
