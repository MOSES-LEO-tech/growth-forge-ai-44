import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const isCI = process.env.CI === "true";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Diagnostic: Enable detailed error logging
    hmr: {
      overlay: true,
    },
  },
  // Diagnostic: Disable dependency optimization caching to prevent corruption
  optimizeDeps: {
    noDiscovery: false,
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    // Diagnostic: Clear module pre-bundling cache
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "charts-vendor": ["recharts"],
          "supabase-vendor": ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  plugins: [
    react(),
    !isCI && VitePWA({
      registerType: "prompt",
      injectRegister: null,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "page-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "Growth Forge AI",
        short_name: "GrowthForge",
        description: "Track achievements, projects, and opportunities with AI.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0ea5e9",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));



