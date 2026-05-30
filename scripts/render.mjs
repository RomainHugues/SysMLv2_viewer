// End-to-end check (no VS Code): parse a .sysml file, then for the chosen diagram
// type run the registry's build() on the first package and print the Mermaid text.
// Usage: node scripts/render.mjs <type> [file.sysml]
//   <type> = flowchart | class | state | sequence
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);

const type = process.argv[2] || "flowchart";
const file = process.argv[3] || path.join(repo, "examples/coffee.sysml");
const S = (p) => JSON.stringify(path.join(repo, p));

const harness = `
import fs from "fs";
import { parseText } from ${S("src/sysml/parser.ts")};
import { allPackages } from ${S("src/sysml/packageAtCursor.ts")};
import { diagramTypes } from ${S("src/diagrams/registry.ts")};
(async () => {
  const text = fs.readFileSync(${JSON.stringify(path.resolve(file))}, "utf8");
  const { document } = await parseText(${JSON.stringify(path.resolve(file))}, text);
  const pkgs = allPackages(document);
  console.log("PACKAGES:", pkgs.map((p) => p.declaredName).join(", "));
  const dt = diagramTypes.find((d) => d.id === ${JSON.stringify(type)});
  if (!dt) { console.error("unknown type"); process.exit(1); }
  const out = dt.build(pkgs[0], { direction: "TB", theme: "default" });
  console.log("\\n----- " + dt.label.toUpperCase() + " MERMAID -----");
  console.log(out == null ? "(null — no relevant elements)" : out);
})().catch((e) => { console.error(e); process.exit(1); });
`;

const outfile = path.join(repo, "dist/_render.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "render.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node18", outfile, alias: parserAlias, logLevel: "warning",
});
await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });
fs.rmSync(outfile + ".map", { force: true });
