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
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const apiKey = req.headers["x-avatares-api-key"];
            if (typeof apiKey === "string" && apiKey.trim()) {
              proxyReq.setHeader("X-Avatares-Api-Key", apiKey.trim());
            }
          });
        },
      },
    },
  },
});
