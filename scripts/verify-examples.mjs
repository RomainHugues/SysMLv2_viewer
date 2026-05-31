// Verify every example parses cleanly and renders its intended diagram.
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);
const S = (p) => JSON.stringify(path.join(repo, p));

const MAP = {
  "coffee.sysml": "flowchart",
  "order_fulfillment.sysml": "flowchart",
  "approval_workflow.sysml": "flowchart",
  "vehicle.sysml": "class",
  "library.sysml": "class",
  "robot.sysml": "class",
  "traffic_light.sysml": "state",
  "door_lock.sysml": "state",
  "media_player.sysml": "state",
  "order_protocol.sysml": "sequence",
  "auth_handshake.sysml": "sequence",
  "atm_withdrawal.sysml": "sequence",
  "arcadia/drone_system.sysml": "class",
  "naf/c2_system.sysml": "class",
  "vehicle_requirements.sysml": "requirement",
};

const harness = `
import fs from "fs";
import path from "path";
import { parseText } from ${S("src/sysml/parser.ts")};
import { allPackages } from ${S("src/sysml/packageAtCursor.ts")};
import { diagramTypes } from ${S("src/diagrams/registry.ts")};
const MAP = ${JSON.stringify(MAP)};
const dir = ${S("examples")};
(async () => {
  let fail = 0;
  for (const [fileName, type] of Object.entries(MAP)) {
    const file = path.join(dir, fileName);
    const text = fs.readFileSync(file, "utf8");
    const { document } = await parseText(file, text);
    const errs = (document.parseResult.parserErrors || []).length + (document.parseResult.lexerErrors || []).length;
    const pkg = allPackages(document)[0];
    const dt = diagramTypes.find((d) => d.id === type);
    const out = pkg ? dt.build(pkg, { direction: "TB", theme: "default" }) : null;
    const lines = out ? out.split("\\n").length : 0;
    const ok = errs === 0 && out != null;
    if (!ok) fail++;
    console.log(\`\${ok ? "OK " : "XX "} \${fileName.padEnd(26)} \${type.padEnd(10)} parseErr=\${errs} \${out ? lines + " mermaid lines" : "(null build!)"}\`);
  }
  console.log(fail === 0 ? "\\nALL EXAMPLES OK" : \`\\n\${fail} EXAMPLE(S) FAILED\`);
  if (fail > 0) process.exit(2);
})().catch((e) => { console.error(e); process.exit(1); });
`;

const outfile = path.join(repo, "dist/_verify.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "verify.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node18", outfile, alias: parserAlias, logLevel: "warning",
});
await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });
fs.rmSync(outfile + ".map", { force: true });
