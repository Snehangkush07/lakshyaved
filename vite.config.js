import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: 'localhost',
    port: 8000,
    allowedHosts: 'all',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      manifest: {
        name: "LAKSHYAVED",
        short_name: "Lakshyaved",
        description: "Offline AI Career Guidance Platform",
        theme_color: "#13ec6d",
        background_color: "#0b0f19",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 5000000 // To cache larger static datasets like roles.v1.json if needed
      }
    })
  ],
})
