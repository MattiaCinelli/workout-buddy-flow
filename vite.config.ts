import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import packageJson from "./package.json";

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
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // The only chunk over the default 500 KB warning is `charts` (Recharts),
    // and it is lazy-loaded — the Progress screens are the only things that
    // pull it in. Everything on the critical path is well under.
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
