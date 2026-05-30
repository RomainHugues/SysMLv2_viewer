// End-to-end check (no VS Code): parse -> extractFlow -> flowToMermaid, print result.
// Usage: node scripts/render-flow.mjs [file.sysml]
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);
const file = process.argv[2] || path.join(repo, "examples/coffee.sysml");

const S = (p) => JSON.stringify(path.join(repo, p));
const harness = `
import fs from "fs";
import { parseText } from ${S("src/sysml/parser.ts")};
import { allPackages } from ${S("src/sysml/packageAtCursor.ts")};
import { extractFlow } from ${S("src/diagrams/flowchart/extract.ts")};
import { flowToMermaid } from ${S("src/diagrams/flowchart/mermaid.ts")};
(async () => {
  const file = ${JSON.stringify(path.resolve(file))};
  const text = fs.readFileSync(file, "utf8");
  const { document } = await parseText(file, text);
  const pkgs = allPackages(document);
  console.log("PACKAGES:", pkgs.map((p) => p.declaredName).join(", "));
  const model = extractFlow(pkgs[0]);
  console.log("GROUPS:", model.groups.map((g) => g.label + "(" + g.nodes.length + "n/" + g.edges.length + "e)").join(", "));
  console.log("\\n----- MERMAID -----");
  console.log(flowToMermaid(model, { direction: "TB" }));
})().catch((e) => { console.error(e); process.exit(1); });
`;

const outfile = path.join(repo, "dist/_render-flow.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "render.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node18", outfile, alias: parserAlias, logLevel: "warning",
});
await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });
fs.rmSync(outfile + ".map", { force: true });
