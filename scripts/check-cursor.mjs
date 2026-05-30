// Verify findEnclosingPackage maps a cursor offset to the enclosing package.
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);
const file = path.join(repo, "examples/coffee.sysml");
const S = (p) => JSON.stringify(path.join(repo, p));

const harness = `
import fs from "fs";
import { parseText } from ${S("src/sysml/parser.ts")};
import { findEnclosingPackage } from ${S("src/sysml/packageAtCursor.ts")};
(async () => {
  const file = ${JSON.stringify(file)};
  const text = fs.readFileSync(file, "utf8");
  const { document } = await parseText(file, text);
  const checks = [
    ["inside BrewCoffee (at 'grind')", text.indexOf("grind")],
    ["inside Maintenance (at 'rinse')", text.indexOf("rinse")],
    ["at offset 0 (before package)", 0],
  ];
  for (const [label, offset] of checks) {
    const pkg = findEnclosingPackage(document, offset);
    console.log(label, "=> offset", offset, "=> package:", pkg ? pkg.declaredName : "<none>");
  }
})().catch((e) => { console.error(e); process.exit(1); });
`;

const outfile = path.join(repo, "dist/_check-cursor.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "cc.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node18", outfile, alias: parserAlias, logLevel: "warning",
});
await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });
fs.rmSync(outfile + ".map", { force: true });
