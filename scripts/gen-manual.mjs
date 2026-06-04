// Generate manual/SysML-Mermaid-Viewer-Manual.pdf:
//   1. compute the Mermaid for each showcased example (styled where relevant),
//   2. build a self-contained HTML (cover, features, changelog, examples with
//      syntax-highlighted SysML + the rendered diagram + a blurb),
//   3. print it to PDF with headless Edge/Chrome (which renders Mermaid).
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const manualDir = path.join(repo, "manual");
fs.mkdirSync(manualDir, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));

const EXAMPLES = [
  { file: "examples/coffee.sysml", type: "flowchart", title: "Flowchart — action flow with a decision",
    blurb: "An <code>action def</code> with a decision node, guarded branches and a loop. Action usages become nodes, successions become edges, and transition guards label the edges. Non-flow elements (attributes, parts) are filtered out." },
  { file: "examples/order_fulfillment.sysml", type: "flowchart", title: "Flowchart — parallel actions (fork / join)",
    blurb: "<code>fork</code> and <code>join</code> control nodes split work into parallel branches and re-synchronize them." },
  { file: "examples/chains/surveillance.sysml", type: "flowchart", title: "Flowchart — functional chains &amp; performers (Capella-style)",
    blurb: "Each chain is a <code>use case</code> that <code>perform</code>s its functions; the boxes and flows of a chain get a bold coloured border, and a function shared by several chains (here <code>identify</code>) gets a dark border. The <code>part</code> performers (green) are linked to the actions they realise by dashed <em>performed&nbsp;by</em> edges. Actions (blue) and parts (green) are colour-coded by default. Legends recall both codes." },
  { file: "examples/vehicle.sysml", type: "class", title: "Class — structure, inheritance &amp; composition",
    blurb: "Definitions become classes; specializations (<code>:&gt;</code>) are inheritance, typed part usages are compositions with multiplicities, and enumerations list their literals." },
  { file: "examples/traffic_light.sysml", type: "state", title: "State — a traffic-light machine",
    blurb: "A <code>state def</code> with its states and transitions. The <code>entry</code> pseudostate is rendered as the initial transition <code>[*]</code>." },
  { file: "examples/order_protocol.sysml", type: "sequence", title: "Sequence — message flow",
    blurb: "Part usages become participants and directed <code>flow</code>s become ordered messages between them." },
  { file: "examples/vehicle_requirements.sysml", type: "requirement", title: "Requirement — derive, decompose &amp; satisfy",
    blurb: "Requirement definitions become «requirement» boxes. Specialization is derivation, nested requirement usages are decomposition, and a part that <code>satisfy</code>s a requirement is linked with a satisfy dependency. The subject is shown inside the box." },
  { file: "examples/breakdown/function_breakdown.sysml", type: "class", title: "Class as BDD — function breakdown (FBS)",
    blurb: "The class diagram is the SysML Block Definition Diagram. Each function is an <code>action def</code> (the «action» stereotype) and a function decomposed into sub-functions via typed <code>action</code> usages becomes composition — giving a top-down function breakdown tree." },
  { file: "examples/breakdown/component_breakdown.sysml", type: "class", title: "Class as BDD — component breakdown (PBS)",
    blurb: "Same BDD, for structure: each component is a <code>part def</code> and typed <code>part</code> usages are composition, giving a top-down component breakdown tree." },
  { file: "examples/arcadia/drone_system.sysml", type: "class", title: "Styling — Arcadia colour code",
    style: "examples/arcadia/arcadia.style.json",
    blurb: "With the Arcadia style file selected, components are coloured by their Arcadia type, following the specialization hierarchy: operational entities orange, logical components blue, physical nodes yellow." },
  { file: "examples/naf/c2_system.sysml", type: "class", title: "Styling — NAF v4 by grid layer",
    style: "examples/naf/naf.style.json",
    blurb: "With the NAF style file selected, elements are coloured by NAF grid layer: Concepts purple, Service blue, Logical green, Physical/Resource orange." },
  { file: "examples/interconnection/avionics_power.sysml", type: "interconnection", title: "Interconnection (IBD) — structure",
    blurb: "The SysML Internal Block Diagram. Each <code>part</code> is a block carrying its <code>port</code>s; a <code>connect</code> is a thin line and a typed <code>interface</code> a bold (purple) connector between ports." },
  { file: "examples/interconnection/signal_chain.sysml", type: "interconnection", title: "Interconnection (IBD) — data flow",
    blurb: "Same view for behaviour: each <code>action</code> is a block carrying its <code>in</code>/<code>out</code> <code>ref</code> parameters (▸ marks the direction), and an item <code>flow</code> is a directed (green) connector labelled with the flowing item." },
];

const FEATURES = [
  "Render the contents of a SysML v2 package as a Mermaid diagram from the editor (right-click → Celeris).",
  "Six diagram types: flowchart, class, state, sequence, requirement and interconnection (IBD).",
  "The class diagram doubles as a Block Definition Diagram (BDD): function breakdowns (action def) and component breakdowns (part def) render as composition trees.",
  "Interconnection (Internal Block Diagram): parts with their ports wired by connect/interface, and actions with in/out ref parameters wired by item flows.",
  "In-process parsing with the open-source SysML v2 parser (syside-languageserver); reusable profile libraries in sibling files are resolved automatically.",
  "Per-panel toolbar: ⟳ Refresh, ⤓ PNG export, zoom/pan controls (−, 1:1, +, Fit, mouse-wheel zoom, drag-to-pan), and a syntax-error indicator.",
  "Auto-refresh open diagrams when the .sysml file is saved (configurable).",
  "Type-based styling from a JSON style file: colour elements by native SysML type and/or by the SysML type they conform to (hierarchy-followed).",
  "Flowchart colour code by node kind by default (actions blue, control nodes amber, parts green), overridable by a style file.",
  "Performers in flowcharts: a part that performs an action is shown as a component linked to it by a dashed allocation edge (which component realises each function).",
  "Capella-style functional chains: model each chain as a use case that performs its functions to highlight the chain (and its flows) with bold coloured borders, with shared functions marked.",
  "Ready-made Arcadia and NAF v4 styling profiles.",
  "View toggles (Defs, Inherited) to declutter the class and requirement diagrams: hide definition boxes and/or inherited types (inheritance edges and imported supertypes), per panel.",
  "Open several diagrams at once, one per panel.",
];

const CHANGELOG = [
  ["Flowchart", "Action flows with decisions, fork/join/merge and guarded transitions."],
  ["Class / State / Sequence", "Three further diagram types sharing the parser and rendering infrastructure."],
  ["Auto-refresh & PNG export", "Live refresh on save and one-click PNG export of any diagram."],
  ["Type-based styling", "JSON style files, with reusable Arcadia and NAF v4 profiles."],
  ["Functional chains & performers", "Capella-style chains (use case + perform) and the parts that perform each function, in flowcharts; built-in colour code by node kind."],
  ["View toggles", "Hide definitions / inherited types in the class and requirement diagrams (per-panel toolbar)."],
];

// --- 1. compute mermaid for each example via the real pipeline ----------------
const dataFile = path.join(manualDir, "_data.json");
const S = (p) => JSON.stringify(path.join(repo, p));
const harness = `
import fs from "fs";
import { parseText } from ${S("src/sysml/parser.ts")};
import { allPackages } from ${S("src/sysml/packageAtCursor.ts")};
import { diagramTypes } from ${S("src/diagrams/registry.ts")};
import { parseStyleSheet } from ${S("src/style/style.ts")};
const EXAMPLES = ${JSON.stringify(EXAMPLES)};
const repo = ${JSON.stringify(repo)};
(async () => {
  const out = [];
  for (const ex of EXAMPLES) {
    const file = repo + "/" + ex.file;
    const sysml = fs.readFileSync(file, "utf8");
    const { document } = await parseText(file, sysml);
    const pkg = allPackages(document)[0];
    const dt = diagramTypes.find((d) => d.id === ex.type);
    const styleSheet = ex.style ? parseStyleSheet(JSON.parse(fs.readFileSync(repo + "/" + ex.style, "utf8"))) : undefined;
    const mermaid = dt.build(pkg, { direction: "TB", theme: "default", styleSheet });
    out.push({ ...ex, sysml, mermaid });
  }
  fs.writeFileSync(${JSON.stringify(dataFile)}, JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
`;
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);
const harnessOut = path.join(manualDir, "_harness.cjs");
await esbuild.build({
  stdin: { contents: harness, resolveDir: repo, loader: "ts", sourcefile: "manual-harness.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node18", outfile: harnessOut, alias: parserAlias, logLevel: "warning",
});
// Run the bundled harness as a child process so it fully completes (writes
// _data.json) before we continue.
execFileSync(process.execPath, [harnessOut], { stdio: "inherit" });
const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));

// --- 2. build HTML ------------------------------------------------------------
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KW = ["package", "library", "part", "def", "action", "state", "item", "attribute", "ref", "port",
  "enum", "flow", "transition", "succession", "first", "then", "if", "else", "import", "private", "public",
  "protected", "connect", "entry", "exit", "do", "decide", "fork", "join", "merge", "send", "accept",
  "occurrence", "constraint", "requirement", "specializes", "subsets", "redefines"];
const kwRe = new RegExp("\\b(" + KW.join("|") + ")\\b", "g");
function highlight(code) {
  return code.split("\n").map((line) => {
    const ci = line.indexOf("//");
    const codePart = ci >= 0 ? line.slice(0, ci) : line;
    const comPart = ci >= 0 ? line.slice(ci) : "";
    let h = escapeHtml(codePart).replace(kwRe, '<span class="kw">$1</span>');
    if (comPart) h += '<span class="cm">' + escapeHtml(comPart) + "</span>";
    return h;
  }).join("\n");
}

const mermaidJs = fs.readFileSync(path.join(repo, "media/mermaid.min.js"), "utf8");
const iconB64 = fs.readFileSync(path.join(repo, "icons/icon.png")).toString("base64");

const examplesHtml = data.map((ex) => `
  <section class="example">
    <h3>${ex.title}</h3>
    <p class="blurb">${ex.blurb}</p>
    <div class="cols">
      <div class="code">
        <div class="cap">${ex.file}</div>
        <pre><code>${highlight(ex.sysml)}</code></pre>
      </div>
      <div class="diagram">
        <div class="cap">${ex.type} diagram</div>
        <pre class="mermaid">${escapeHtml(ex.mermaid)}</pre>
      </div>
    </div>
  </section>`).join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${pkg.displayName} — Manual</title>
<style>
  :root { --ink:#1f2a44; --muted:#5b6577; --line:#d7deea; --kw:#1b66c9; --cm:#6a9955; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: var(--ink); margin: 0; }
  h1,h2,h3 { color: var(--ink); }
  code, pre { font-family: "Cascadia Code", Consolas, monospace; }
  .cover { height: 247mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .cover img { width: 120px; height: 120px; border-radius: 24px; }
  .cover h1 { font-size: 30px; margin: 18px 0 4px; }
  .cover .sub { color: var(--muted); font-size: 15px; }
  .cover .ver { margin-top: 10px; font-size: 13px; color: var(--muted); }
  section { break-inside: avoid; }
  h2 { break-before: page; border-bottom: 2px solid var(--line); padding-bottom: 6px; margin-top: 0; }
  ul { line-height: 1.5; }
  .changelog li { margin-bottom: 6px; }
  .example { margin: 18px 0; padding-top: 6px; }
  .example h3 { margin: 0 0 4px; font-size: 16px; }
  .blurb { color: var(--muted); margin: 0 0 10px; font-size: 13px; line-height: 1.45; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
  .cap { font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
  pre { margin: 0; background: #f6f8fc; border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 10.5px; overflow: hidden; white-space: pre-wrap; }
  .code .kw { color: var(--kw); font-weight: 600; }
  .code .cm { color: var(--cm); font-style: italic; }
  .diagram pre.mermaid { background: #fff; text-align: center; }
  .diagram svg { max-width: 100%; height: auto; }
  @page { size: A4; margin: 14mm; }
</style></head>
<body>
  <div class="cover">
    <img src="data:image/png;base64,${iconB64}" alt="logo"/>
    <h1>${pkg.displayName}</h1>
    <div class="sub">${pkg.description}</div>
    <div class="ver">Version ${pkg.version} &nbsp;·&nbsp; User Manual</div>
  </div>

  <h2>Features</h2>
  <ul>${FEATURES.map((f) => `<li>${f}</li>`).join("")}</ul>

  <h2>Highlights</h2>
  <ul class="changelog">${CHANGELOG.map(([t, d]) => `<li><b>${t}.</b> ${d}</li>`).join("")}</ul>

  <h2>Examples</h2>
  ${examplesHtml}

  <script>${mermaidJs}</script>
  <script>
    mermaid.initialize({ startOnLoad: true, securityLevel: "loose", flowchart: { htmlLabels: false } });
  </script>
</body></html>`;

const htmlFile = path.join(manualDir, "manual.html");
fs.writeFileSync(htmlFile, html);

// --- 3. print to PDF with headless Edge/Chrome --------------------------------
const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) throw new Error("No Edge/Chrome found to render the PDF.");

const pdfFile = path.join(manualDir, "Celeris-Manual.pdf");
execFileSync(browser, [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  "--no-pdf-header-footer",
  "--virtual-time-budget=30000",
  `--print-to-pdf=${pdfFile}`,
  pathToFileURL(htmlFile).href,
], { stdio: "inherit" });

// cleanup intermediates
for (const f of [harnessOut, harnessOut + ".map", dataFile]) fs.rmSync(f, { force: true });
console.log(`[manual] wrote ${pdfFile}`);
