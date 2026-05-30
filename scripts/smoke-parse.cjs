/*
 * Standalone smoke test: parse a .sysml file with the built syside-languageserver
 * and print parse errors + the AST element tree. Run with cwd = the languageserver
 * package dir so bare requires (langium, vscode-uri) resolve from its node_modules.
 *
 *   cd <clone>/packages/syside-languageserver
 *   node <repo>/scripts/smoke-parse.cjs <abs-path-to.sysml>
 */
const path = require("path");
const { createRequire } = require("module");

// Resolve all parser modules from the cloned languageserver package's node_modules.
const LSDIR = process.env.LSDIR ||
  "C:/Users/melym/Documents/Romain/_sysml-2ls-src/packages/syside-languageserver";
const req = createRequire(path.join(LSDIR, "package.json"));

let URI;
try { URI = req("vscode-uri").URI; } catch { URI = req("langium").URI; }
const { streamAllContents } = req("langium");

const LS = req("./lib/index.js");
const NODE = req("./lib/node/index.js");

async function main() {
  const file = process.argv[2];
  if (!file) { console.error("usage: smoke-parse.cjs <file.sysml>"); process.exit(1); }

  console.log("createSysMLServices keys:", Object.keys(LS.createSysMLServices(NODE.SysMLNodeFileSystem)));
  const services = LS.createSysMLServices(NODE.SysMLNodeFileSystem).SysML;

  const uri = URI.file(path.resolve(file));
  const doc = services.shared.workspace.LangiumDocuments.getOrCreateDocument(uri);
  await services.shared.workspace.DocumentBuilder.build([doc], {
    validationChecks: "none",
    standardLibrary: "none",
  });

  const pr = doc.parseResult;
  console.log("\n=== PARSE ERRORS ===");
  console.log("lexerErrors:", (pr.lexerErrors || []).length);
  console.log("parserErrors:", (pr.parserErrors || []).map((e) => e.message).slice(0, 10));
  console.log("diagnostics:", (doc.diagnostics || []).map((d) => `${d.range.start.line + 1}: ${d.message}`).slice(0, 10));

  const root = pr.value;
  console.log("\n=== ROOT ===", root && root.$type);

  console.log("\n=== ALL ELEMENTS ($type | name | declaredName) ===");
  let n = 0;
  for (const node of streamAllContents(root)) {
    const name = node.name ?? node.declaredName ?? node.shortName ?? "";
    console.log(`${"  ".repeat(depth(node, root))}${node.$type}  ${name}`);
    if (++n > 200) { console.log("...truncated"); break; }
  }
}

function depth(node, root) {
  let d = 0, c = node;
  while (c && c !== root) { d++; c = c.$container; }
  return d;
}

main().catch((e) => { console.error(e); process.exit(1); });
