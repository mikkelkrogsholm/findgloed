/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  appType: "spa",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      strategies: "generateSW",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "robots.txt"
      ],
      manifest: {
        name: "Glød",
        short_name: "Glød",
        description:
          "Et voksent rum til lyst, nærvær og begivenheder — i samarbejde med Dansk Sexologisk Akademi.",
        lang: "da",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0c0a09",
        theme_color: "#0c0a09",
        categories: ["lifestyle", "social"],
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png"
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          // API: aldrig caches — vi vil ikke gemme følsomme svar lokalt.
          // Beslutning 4 + 6: profil/billed-data skal opt-in pr. visning.
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
            method: "GET"
          },
          // Brugeruploadede billeder: aldrig cache, beslutning 4
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
            handler: "NetworkOnly",
            method: "GET"
          },
          // Fonte fra cdns
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: "module",
        navigateFallback: "/index.html"
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: parseInt(process.env.PORT || "5173"),
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:4564",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});
