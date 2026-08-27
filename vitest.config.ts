import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Node by default (fast); files that need a DOM opt in with a
    // `// @vitest-environment jsdom` docblock.
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      // `npm run test:coverage` prints a summary; the HTML report under
      // coverage/ is git-ignored.
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        // Design-system primitives (shadcn/ui) — vendored, not our logic.
        "src/components/ui/**",
        // Type-only and static seed-data modules.
        "src/**/*.d.ts",
        "src/data/**",
        "src/main.tsx",
        "src/App.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
});
