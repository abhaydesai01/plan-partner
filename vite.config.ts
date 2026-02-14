import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg", "placeholder.svg"],
      manifest: {
        name: "Mediimate Patient",
        short_name: "Mediimate",
        description: "Your health at a glance — chat with AI, log meals, vitals, and stay connected with your doctor.",
        start_url: "/patient",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#0f172a",
        theme_color: "#0d9488",
        scope: "/",
        icons: [
          { src: "/pwa-icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
          { src: "/pwa-icon.svg", type: "image/svg+xml", sizes: "512x512", purpose: "maskable" },
        ],
        categories: ["health", "medical", "lifestyle"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 32, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
