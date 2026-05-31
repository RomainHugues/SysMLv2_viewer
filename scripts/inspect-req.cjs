// Probe requirement-diagram AST: requirement defs/usages, subject, satisfy, derive.
// node scripts/inspect-req.cjs examples/vehicle_requirements.sysml
const path = require("path");
const { createRequire } = require("module");
const LSDIR = process.env.LSDIR || "C:/Users/melym/Documents/Romain/_sysml-2ls-src/packages/syside-languageserver";
const req = createRequire(path.join(LSDIR, "package.json"));
let URI; try { URI = req("vscode-uri").URI; } catch { URI = req("langium").URI; }
const { streamAllContents } = req("langium");
const LS = req("./lib/index.js");
const NODE = req("./lib/node/index.js");
const safe = (fn, d = "?") => { try { return fn(); } catch (e) { return d + ":" + e.message; } };
const qn = (m) => safe(() => m.qualifiedName ?? m.name, "");

(async () => {
  const file = process.argv[2];
  const services = LS.createSysMLServices(NODE.SysMLNodeFileSystem).SysML;
  const uri = URI.file(path.resolve(file));
  const doc = services.shared.workspace.LangiumDocuments.getOrCreateDocument(uri);
  await services.shared.workspace.DocumentBuilder.build([doc], { validationChecks: "none", standardLibrary: "none" });
  const root = doc.parseResult.value;
  const txt = (n) => (n && n.$cstNode ? doc.textDocument.getText(n.$cstNode.range).replace(/\s+/g, " ").trim() : "?");

  console.log("##### MARK #####");
  console.log("parserErrors:", doc.parseResult.parserErrors.length);
  for (const node of streamAllContents(root)) {
    const t = node.$type;
    if (/Requirement|Satisfy|Subject|Concern|Stakeholder/.test(t)) {
      console.log(`\n${t}  name=${node.declaredName ?? "(anon)"}  qn=${qn(node.$meta)}`);
      console.log("  keys:", Object.keys(node).filter((k) => !k.startsWith("$")).join(","));
      console.log("  specializations:", safe(() => node.$meta.specializations().map((s) => `${s.constructor && s.constructor.name}->${qn(safe(() => s.element(), "x"))}`)));
      console.log("  types:", safe(() => (node.$meta.types ? [...node.$meta.types()].map((x) => qn(x)) : "n/a")));
      console.log("  text:", txt(node).slice(0, 80));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
