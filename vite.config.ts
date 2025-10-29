import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa'; // Import VitePWA

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(),
    react(),
    VitePWA({ // Add VitePWA plugin configuration
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        name: "GB Finance App",
        short_name: "GB Finance",
        description: "A personal finance tracker for managing sales and expenses.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#22c55e",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "48x48",
            type: "image/x-icon"
          },
          {
            src: "/finance-icon.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "/finance-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));