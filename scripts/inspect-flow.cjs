// One-off API probe: how to read succession/transition source+target and guards
// from the syside metamodel. Run: node scripts/inspect-flow.cjs examples/coffee.sysml
const path = require("path");
const { createRequire } = require("module");
const LSDIR = process.env.LSDIR ||
  "C:/Users/melym/Documents/Romain/_sysml-2ls-src/packages/syside-languageserver";
const req = createRequire(path.join(LSDIR, "package.json"));
let URI; try { URI = req("vscode-uri").URI; } catch { URI = req("langium").URI; }
const { streamAllContents, streamReferences } = req("langium");
const LS = req("./lib/index.js");
const NODE = req("./lib/node/index.js");

const safe = (fn, d = "?") => { try { return fn(); } catch (e) { return d + ":" + e.message; } };

(async () => {
  const file = process.argv[2];
  const services = LS.createSysMLServices(NODE.SysMLNodeFileSystem).SysML;
  const uri = URI.file(path.resolve(file));
  const doc = services.shared.workspace.LangiumDocuments.getOrCreateDocument(uri);
  await services.shared.workspace.DocumentBuilder.build([doc], { validationChecks: "none", standardLibrary: "none" });
  const root = doc.parseResult.value;
  const txt = (n) => (n && n.$cstNode ? doc.textDocument.getText(n.$cstNode.range).replace(/\s+/g, " ").trim() : "?");

  console.log("##### MARK #####");
  for (const node of streamAllContents(root)) {
    const t = node.$type;
    if (t === "ActionUsage" || t === "DecisionNode" || t === "MergeNode" || t === "ForkNode" || t === "JoinNode") {
      console.log(`NODE ${t} | declaredName=${node.declaredName} | meta.name=${safe(() => node.$meta.name)} | meta.qn=${safe(() => node.$meta.qualifiedName)}`);
    }
    if (t === "SuccessionAsUsage") {
      // every edge is a SuccessionAsUsage; refs come in document order [source, target]
      const refs = safe(() => [...streamReferences(node)].map((r) => ({
        text: r.reference.$refText,
        resolvedQn: r.reference.ref ? safe(() => r.reference.ref.$meta.qualifiedName) : null,
      })), []);
      // is it nested inside a guarded transition?
      let guardText = null, c = node.$container;
      while (c) { if (c.$type === "TransitionUsage") { guardText = safe(() => txt(c.guard)); break; } c = c.$container; }
      console.log(`EDGE Succession | refs=${JSON.stringify(refs)} | guard=${JSON.stringify(guardText)} | text="${txt(node)}"`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
