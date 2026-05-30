// Vendoring: bundle the open-source SysML parser into a single self-contained
// CJS file committed to the repo (vendor/syside.cjs), so the extension build no
// longer needs the external sysml-2ls clone. Re-run this only to update the parser.
//
//   node scripts/build-vendor.mjs      (expects the clone at ../_sysml-2ls-src,
//                                       or set SYSIDE_DIR to the languageserver pkg)
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const SYSIDE =
  process.env.SYSIDE_DIR ||
  path.resolve(repo, "../_sysml-2ls-src/packages/syside-languageserver");
const cloneRoot = path.resolve(SYSIDE, "../..");

const vendorDir = path.join(repo, "vendor");
fs.mkdirSync(vendorDir, { recursive: true });

// Single entry re-exporting everything the extension (and dev harnesses) use.
const entry = `
export { createSysMLServices } from "syside-languageserver";
export { SysMLNodeFileSystem } from "syside-languageserver/node";
export { findLeafNodeAtOffset, streamAllContents, streamReferences } from "langium";
`;

await esbuild.build({
  stdin: { contents: entry, resolveDir: repo, loader: "js", sourcefile: "vendor-entry.js" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: path.join(vendorDir, "syside.cjs"),
  alias: {
    "syside-languageserver": path.join(SYSIDE, "lib/index.js"),
    "syside-languageserver/node": path.join(SYSIDE, "lib/node/index.js"),
    langium: path.join(SYSIDE, "node_modules/langium"),
  },
  logLevel: "info",
});

// Carry the upstream license alongside the vendored code (EPL-2.0 / GPL-2.0 + CE).
fs.copyFileSync(path.join(cloneRoot, "LICENSE"), path.join(vendorDir, "LICENSE-sysml-2ls.txt"));

const version = JSON.parse(fs.readFileSync(path.join(SYSIDE, "package.json"), "utf8")).version;
fs.writeFileSync(
  path.join(vendorDir, "NOTICE.md"),
  `# Vendored third-party code

\`syside.cjs\` is a bundled build of **syside-languageserver** v${version}
(the SysML v2 parser/language server), from
https://github.com/sensmetry/sysml-2ls (primary: gitlab.com/sensmetry/public/sysml-2ls).

Copyright (c) Sensmetry UAB and others.
Licensed under **EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0** — see
[LICENSE-sysml-2ls.txt](./LICENSE-sysml-2ls.txt). It also bundles its
dependencies (langium, chevrotain, vscode-languageserver, ...), each under their
own licenses.

Regenerate with \`node scripts/build-vendor.mjs\` against a clone of sysml-2ls.
`
);

console.log("[vendor] wrote vendor/syside.cjs (parser v" + version + ") + license + NOTICE");
