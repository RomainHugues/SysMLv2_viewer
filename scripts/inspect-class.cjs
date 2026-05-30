// Probe class-diagram-relevant metamodel API: definitions, supertypes, features+types.
// node scripts/inspect-class.cjs examples/vehicle.sysml
const path = require("path");
const { createRequire } = require("module");
const LSDIR = process.env.LSDIR ||
  "C:/Users/melym/Documents/Romain/_sysml-2ls-src/packages/syside-languageserver";
const req = createRequire(path.join(LSDIR, "package.json"));
let URI; try { URI = req("vscode-uri").URI; } catch { URI = req("langium").URI; }
const { streamAllContents } = req("langium");
const LS = req("./lib/index.js");
const NODE = req("./lib/node/index.js");
const safe = (fn, d = "?") => { try { const v = fn(); return v; } catch (e) { return d + ":" + e.message; } };
const qn = (m) => safe(() => m.qualifiedName ?? m.name, "");

const DEFS = new Set(["PartDefinition", "ItemDefinition", "AttributeDefinition", "EnumerationDefinition", "PortDefinition", "InterfaceDefinition"]);
const USAGES = new Set(["AttributeUsage", "PartUsage", "ItemUsage", "PortUsage", "ReferenceUsage", "EnumerationUsage"]);

(async () => {
  const file = process.argv[2];
  const services = LS.createSysMLServices(NODE.SysMLNodeFileSystem).SysML;
  const uri = URI.file(path.resolve(file));
  const doc = services.shared.workspace.LangiumDocuments.getOrCreateDocument(uri);
  await services.shared.workspace.DocumentBuilder.build([doc], { validationChecks: "none", standardLibrary: "none" });
  const root = doc.parseResult.value;

  console.log("##### MARK #####");
  for (const node of streamAllContents(root)) {
    if (!DEFS.has(node.$type)) continue;
    const meta = node.$meta;
    console.log(`\nDEF ${node.$type}  ${node.declaredName}  (qn=${qn(meta)})`);

    // child relationship $types (AST)
    const childTypes = Object.keys(node).filter((k) => !k.startsWith("$"))
      .flatMap((k) => { const v = node[k]; const arr = Array.isArray(v) ? v : [v]; return arr.filter((x) => x && x.$type).map((x) => `${k}:${x.$type}`); });
    console.log("  AST children:", childTypes.join(", ") || "(none)");

    // supertypes via meta
    console.log("  meta.specializations():", safe(() => meta.specializations().map((s) => `${s.constructor && s.constructor.name}->${qn(safe(() => s.element(), "x"))}`)));
    console.log("  meta.types?():", safe(() => (meta.types ? meta.types().map((t) => qn(t)) : "no types()")));

    // owned features + their types
    const fmembers = safe(() => meta.featureMembers().map((mem) => {
      const f = mem.element ? mem.element() : null;
      const fname = f && f.name;
      const types = f && f.types ? safe(() => [...f.types()].map((t) => qn(t))) : "?";
      const ftype = f && f.nodeType ? f.nodeType() : (f && f.ast ? safe(() => f.ast().$type) : "?");
      return `${fname}:${JSON.stringify(types)}[${ftype}]`;
    }), []);
    console.log("  features:", JSON.stringify(fmembers));
  }
})().catch((e) => { console.error(e); process.exit(1); });
