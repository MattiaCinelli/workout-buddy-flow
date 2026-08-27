import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import packageJson from "./package.json";

// The Lovable in-browser editor requires a remote script in index.html. It
// has full access to the origin (IndexedDB, localStorage — including any
// sync token) and phones home on every load, so it must not ship in a
// distributed build. Kept for `vite` dev (the editor), stripped from every
// `vite build`.
const stripLovableEditorScript = (): Plugin => ({
  name: "strip-lovable-editor-script",
  apply: "build",
  transformIndexHtml: (html) =>
    html
      .replace(/\s*<!-- IMPORTANT: DO NOT REMOVE THIS SCRIPT TAG OR THIS VERY COMMENT! -->/g, "")
      .replace(/\s*<script src="https:\/\/cdn\.gpteng\.co\/gptengineer\.js"[^>]*><\/script>/g, ""),
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    stripLovableEditorScript(),
    VitePWA({
      // "prompt" — the app shows an Update available banner rather than
      // silently swapping the running code (see PwaUpdatePrompt).
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icon.svg", "robots.txt"],
      manifest: {
        name: "Workout Buddy",
        short_name: "Workout Buddy",
        description: "Offline-first personal training companion.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the whole built app shell at build time, so a first
        // visit that drops connectivity mid-load can't leave a partial
        // install. Old precaches are cleared on activate.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      // The service worker only runs in the built app — a dev SW fights
      // Vite HMR and doesn't precache the module graph anyway. Offline
      // behaviour is verified against the build output in CI instead.
      devOptions: { enabled: false },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // The only chunk near the 600 KB warning is `charts` (Recharts), and it
    // is lazy-loaded — the Progress screens are the only things that pull it
    // in. Everything on the critical path is well under.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split the heaviest third-party groups out of the main bundle so a
        // first load doesn't ship the charting and date libraries up front.
        manualChunks: {
          charts: ["recharts"],
          datefns: ["date-fns"],
        },
      },
    },
  },
}));
