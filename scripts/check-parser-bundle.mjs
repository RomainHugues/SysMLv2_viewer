// Phase 0 verification: bundle src/sysml/parser.ts with esbuild (using the same
// parser alias as the extension build) and run it on a .sysml file, WITHOUT VS Code.
// Proves the parser resolves, bundles, and executes inside our build pipeline.
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);

const file = process.argv[2] || path.join(repo, "examples/coffee.sysml");

const harness = `
import fs from "fs";
import { streamAllContents } from "langium";
import { parseText } from ${JSON.stringify(path.join(repo, "src/sysml/parser.ts"))};

(async () => {
  const file = ${JSON.stringify(path.resolve(file))};
  const text = fs.readFileSync(file, "utf8");
  const { root, document } = await parseText(file, text);

  const counts = {};
  for (const node of streamAllContents(root)) {
    counts[node.$type] = (counts[node.$type] || 0) + 1;
  }
  const errors = (document.parseResult.parserErrors || []).length
    + (document.parseResult.lexerErrors || []).length;

  console.log("ROOT:", root.$type);
  console.log("PARSE ERRORS:", errors);
  console.log("ELEMENT COUNTS:", JSON.stringify(counts, null, 2));
  if (errors > 0) process.exit(2);
})().catch((e) => { console.error(e); process.exit(1); });
`;

// Build as CJS (matches the extension build) to avoid ESM dynamic-require issues
// with the bundled CommonJS language-server dependencies.
const outfile = path.join(repo, "dist/_parser-check.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "parser-check.ts" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile,
  alias: parserAlias,
  logLevel: "warning",
});

await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });
fs.rmSync(outfile + ".map", { force: true });
