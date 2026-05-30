import { defineConfig } from "vitest/config";
import path from "path";

// Resolve the parser/langium imports to the vendored bundle so integration tests
// run the real parser without needing the external clone.
const VENDOR = path.resolve(__dirname, "vendor/syside.cjs");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^syside-languageserver\/node$/, replacement: VENDOR },
      { find: /^syside-languageserver$/, replacement: VENDOR },
      { find: /^langium$/, replacement: VENDOR },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
