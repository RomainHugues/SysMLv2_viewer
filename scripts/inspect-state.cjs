// Probe state-diagram AST: state defs/usages, transitions (source/target/guard/trigger/effect).
// node scripts/inspect-state.cjs examples/traffic_light.sysml
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
    if (t === "StateDefinition" || t === "StateUsage") {
      console.log(`\n${t} ${node.declaredName} (qn=${qn(node.$meta)})`);
      console.log("  keys:", Object.keys(node).filter((k) => !k.startsWith("$")).join(","));
    }
    if (t === "TransitionUsage") {
      console.log(`  TRANSITION "${txt(node)}"`);
      console.log("    keys:", Object.keys(node).filter((k) => !k.startsWith("$")).join(","));
      console.log("    source:", txt(node.source), "| then:", txt(node.then), "| guard:", txt(node.guard), "| accepter:", txt(node.accepter), "| effect:", txt(node.effect));
    }
    if (t === "SuccessionAsUsage") {
      const rel = safe(() => node.$meta.relatedFeatures().map((f) => (f ? (f.name ?? f.qualifiedName) : "<u>")));
      console.log("    Succession rel:", JSON.stringify(rel), "| text:", txt(node));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
