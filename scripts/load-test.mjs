// Load-test the parser + each renderer on the large examples/stress/ models.
// Usage: node scripts/load-test.mjs
// Reports, per file: parse errors, parse time, build time, and Mermaid output size.
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);
const S = (p) => JSON.stringify(path.join(repo, p));

const CASES = [
  ["flowchart_big.sysml", "flowchart"],
  ["chains_big.sysml", "flowchart"],
  ["class_big.sysml", "class"],
  ["breakdown_big.sysml", "class"],
  ["state_big.sysml", "state"],
  ["sequence_big.sysml", "sequence"],
  ["requirement_big.sysml", "requirement"],
  ["interconnection_big.sysml", "interconnection"],
];

const harness = `
import fs from "fs";
import path from "path";
import { parseText } from ${S("src/sysml/parser.ts")};
import { allPackages } from ${S("src/sysml/packageAtCursor.ts")};
import { diagramTypes } from ${S("src/diagrams/registry.ts")};
const CASES = ${JSON.stringify(CASES)};
const dir = ${S("examples/stress")};
const now = () => Number(process.hrtime.bigint() / 1000n) / 1000; // ms

(async () => {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("file", 26) + pad("type", 14) + pad("parseErr", 9) + pad("parse ms", 10) + pad("build ms", 10) + pad("mermaid", 9) + "size");
  console.log("-".repeat(90));
  let fail = 0;
  for (const [file, type] of CASES) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    let t = now();
    const { document } = await parseText(path.join(dir, file), text);
    const parseMs = now() - t;
    const errs = (document.parseResult.parserErrors||[]).length + (document.parseResult.lexerErrors||[]).length;
    const pkg = allPackages(document)[0];
    const dt = diagramTypes.find((d) => d.id === type);
    t = now();
    const out = pkg ? dt.build(pkg, { direction: "TB", theme: "default" }) : null;
    const buildMs = now() - t;
    const lines = out ? out.split("\\n").length : 0;
    const kb = out ? (Buffer.byteLength(out, "utf8") / 1024).toFixed(1) + "KB" : "(null)";
    const ok = errs === 0 && out != null;
    if (!ok) fail++;
    console.log(
      (ok ? "" : "XX ") + pad(file, ok ? 26 : 23) + pad(type, 14) + pad(errs, 9) +
      pad(parseMs.toFixed(0), 10) + pad(buildMs.toFixed(0), 10) + pad(lines, 9) + kb
    );
  }
  console.log("-".repeat(90));
  console.log(fail === 0 ? "ALL BUILT OK" : fail + " FAILED");
  if (fail > 0) process.exit(2);
})().catch((e) => { console.error(e); process.exit(1); });
`;

const outfile = path.join(repo, "dist/_loadtest.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "lt.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node18", outfile, alias: parserAlias, logLevel: "warning",
});
await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });
fs.rmSync(outfile + ".map", { force: true });
