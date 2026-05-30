// Probe sequence-diagram AST: parts (participants) and flows/messages between them.
// node scripts/inspect-seq.cjs examples/order_protocol.sysml
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
  console.log("parserErrors:", doc.parseResult.parserErrors.map((e) => e.message).slice(0, 5));
  for (const node of streamAllContents(root)) {
    const t = node.$type;
    if (t === "PartUsage" || t === "PartDefinition") {
      console.log(`${t} ${node.declaredName} (qn=${qn(node.$meta)})`);
    }
    if (/Flow|Connection|Message|Send|Accept/.test(t)) {
      console.log(`\n${t} "${txt(node)}"`);
      console.log("  keys:", Object.keys(node).filter((k) => !k.startsWith("$")).join(","));
      console.log("  relatedFeatures:", safe(() => node.$meta.relatedFeatures().map((f) => (f ? (f.name ?? f.qualifiedName) : "<u>"))));
      console.log("  ends:", safe(() => node.$meta.connectorEnds().map((e) => e.name)));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
