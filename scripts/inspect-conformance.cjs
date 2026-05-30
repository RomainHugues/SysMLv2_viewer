// Probe: (1) transitive supertype API on $meta, (2) cross-file import resolution.
// node scripts/inspect-conformance.cjs
const path = require("path");
const { createRequire } = require("module");
const LSDIR = process.env.LSDIR || "C:/Users/melym/Documents/Romain/_sysml-2ls-src/packages/syside-languageserver";
const req = createRequire(path.join(LSDIR, "package.json"));
let URI; try { URI = req("vscode-uri").URI; } catch { URI = req("langium").URI; }
const { streamAllContents } = req("langium");
const LS = req("./lib/index.js");
const NODE = req("./lib/node/index.js");
const safe = (fn, d = "?") => { try { return fn(); } catch (e) { return d + ":" + e.message; } };

(async () => {
  const dir = path.resolve("examples/arcadia");
  const services = LS.createSysMLServices(NODE.SysMLNodeFileSystem).SysML;
  const docs = services.shared.workspace.LangiumDocuments;
  // Load BOTH files together so the import can resolve.
  const files = ["ArcadiaProfile.sysml", "logical.sysml"].map((f) => path.join(dir, f));
  const built = files.map((f) => docs.getOrCreateDocument(URI.file(f)));
  await services.shared.workspace.DocumentBuilder.build(built, { validationChecks: "none", standardLibrary: "none" });

  const logical = built[1];
  console.log("##### MARK #####");
  console.log("logical parseErrors:", logical.parseResult.parserErrors.length);

  for (const node of streamAllContents(logical.parseResult.value)) {
    if (node.$type === "PartUsage" || node.$type === "PartDefinition" || node.$type === "ActionUsage" || node.$type === "ActionDefinition") {
      const meta = node.$meta;
      console.log(`\n${node.$type} ${node.declaredName ?? "(anon)"}`);
      // Candidate APIs to follow the type hierarchy:
      console.log("  types():", safe(() => [...meta.types()].map((t) => t.qualifiedName)));
      console.log("  allTypes?():", safe(() => (meta.allTypes ? [...meta.allTypes()].map((t) => t.qualifiedName) : "n/a")));
      console.log("  specializations():", safe(() => meta.specializations().map((s) => safe(() => s.element()?.qualifiedName, "x"))));
      console.log("  allSupertypes?():", safe(() => (meta.allSupertypes ? [...meta.allSupertypes()].map((t) => t.qualifiedName) : "n/a")));
      // conforms(): does this element conform to a named type? try by-name and by-meta
      console.log("  has conforms():", safe(() => typeof meta.conforms));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
