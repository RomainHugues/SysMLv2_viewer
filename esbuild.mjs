import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copy the Mermaid UMD bundle into media/ so the webview can load it offline.
function copyMermaid() {
  const src = path.join(__dirname, "node_modules/mermaid/dist/mermaid.min.js");
  const dstDir = path.join(__dirname, "media");
  fs.mkdirSync(dstDir, { recursive: true });
  fs.copyFileSync(src, path.join(dstDir, "mermaid.min.js"));
}

// The open-source SysML parser is vendored as a single self-contained bundle in
// vendor/syside.cjs (see scripts/build-vendor.mjs). All parser/langium imports
// resolve to it, so the build needs no external clone. esbuild then inlines it
// into dist/extension.js.
const VENDOR = path.join(__dirname, "vendor/syside.cjs");

export const parserAlias = {
  "syside-languageserver": VENDOR,
  "syside-languageserver/node": VENDOR,
  langium: VENDOR,
};

const options = {
  entryPoints: [path.join(__dirname, "src/extension.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: path.join(__dirname, "dist/extension.js"),
  external: ["vscode"],
  sourcemap: true,
  logLevel: "info",
  alias: parserAlias,
};

// Only build when run directly (`node esbuild.mjs`); stay side-effect-free when
// imported (e.g. by scripts/check-parser-bundle.mjs) so others can read parserAlias.
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  copyMermaid();
  const watch = process.argv.includes("--watch");
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("[esbuild] watching...");
  } else {
    await esbuild.build(options);
    console.log("[esbuild] built dist/extension.js");
  }
}
