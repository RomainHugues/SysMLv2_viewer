import dagre from "@dagrejs/dagre";
import type { ClassModel, ClassNode, ClassRelation } from "./ir";
import type { StyleProps } from "../../style/style";

// Experimental class-diagram renderer: lays the class model out with dagre and
// draws clean, self-contained SVG (no in-browser diagram engine, no extra webview
// payload). Consumes the SAME ClassModel IR as the Mermaid mapper, so every
// example and test that feeds the class view also feeds this one.

const FONT = `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const TITLE_SIZE = 13;
const BODY_SIZE = 12;
const LINE_H = 18;
const PAD_X = 12;
const PAD_Y = 8;
const STEREO_H = 15; // height reserved for the «stereotype» line
const TITLE_H = 22; // height reserved for the bold name line

const NODE_FILL = "#ffffff";
const NODE_STROKE = "#5b6b7b";
const TEXT_COLOR = "#1e2630";
const DOC_COLOR = "#6a7686";
const EDGE_COLOR = "#5b6b7b";

/** Rough text width without a DOM — good enough to size boxes (text is never clipped). */
function textWidth(s: string, size: number, bold = false): number {
  return s.length * size * (bold ? 0.63 : 0.56);
}

/** One-line documentation, stripped and truncated like the Mermaid mapper does. */
function docLine(doc: string): string {
  const t = doc.replace(/\s+/g, " ").trim();
  return t.length > 64 ? t.slice(0, 62) + "…" : t;
}

function xml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

interface BodyLine {
  text: string;
  kind: "doc" | "literal" | "member";
}

interface Box {
  node: ClassNode;
  w: number;
  h: number;
  headerH: number;
  body: BodyLine[];
}

/** Compute a box's size and the lines drawn inside it. */
function layoutBox(c: ClassNode): Box {
  const body: BodyLine[] = [];
  if (c.doc) body.push({ text: docLine(c.doc), kind: "doc" });
  for (const lit of c.literals) body.push({ text: lit, kind: "literal" });
  for (const m of c.members) body.push({ text: `+ ${m.name}${m.type ? " : " + m.type : ""}`, kind: "member" });

  const titleW = textWidth(c.name, TITLE_SIZE, true);
  const stereoW = c.stereotype ? textWidth(`«${c.stereotype}»`, BODY_SIZE) : 0;
  const bodyW = body.reduce((max, l) => Math.max(max, textWidth(l.text, BODY_SIZE)), 0);

  const w = Math.ceil(Math.max(96, titleW, stereoW, bodyW) + PAD_X * 2);
  const headerH = (c.stereotype ? STEREO_H : 0) + TITLE_H;
  const h = Math.ceil(headerH + (body.length > 0 ? body.length * LINE_H + PAD_Y * 2 : 0));
  return { node: c, w, h, headerH, body };
}

/** Drawing geometry for one relation, in IR source→target visual order. */
interface EdgeGeom {
  rel: ClassRelation;
  points: { x: number; y: number }[];
}

/** Build the SVG markers (arrow heads / diamonds) used by the edges. */
function defs(): string {
  return `<defs>
  <marker id="celeris-gen" markerWidth="16" markerHeight="14" refX="14" refY="7" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M0,0 L14,7 L0,14 Z" fill="${NODE_FILL}" stroke="${EDGE_COLOR}" stroke-width="1.2"/>
  </marker>
  <marker id="celeris-arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M0,0 L9,5 L0,10" fill="none" stroke="${EDGE_COLOR}" stroke-width="1.4"/>
  </marker>
  <marker id="celeris-diamond" markerWidth="20" markerHeight="12" refX="1.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1.5,6 L10,1 L18.5,6 L10,11 Z" fill="${EDGE_COLOR}" stroke="${EDGE_COLOR}"/>
  </marker>
</defs>`;
}

function path(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Stroke + marker attributes for a relation kind. */
function edgeAttrs(kind: ClassRelation["kind"]): string {
  switch (kind) {
    case "inheritance":
      return `marker-end="url(#celeris-gen)"`;
    case "composition":
      return `marker-start="url(#celeris-diamond)"`;
    case "dependency":
      return `marker-end="url(#celeris-arrow)" stroke-dasharray="5,4"`;
    default: // association
      return `marker-end="url(#celeris-arrow)"`;
  }
}

function drawNode(b: Box, x: number, y: number): string {
  const c = b.node;
  const st: StyleProps = c.style ?? {};
  const fill = st.fill ?? NODE_FILL;
  const stroke = st.stroke ?? NODE_STROKE;
  const color = st.color ?? TEXT_COLOR;
  const sw = st.strokeWidth ?? (c.external ? "1" : "1.4");
  const dash = c.external ? ` stroke-dasharray="4,3"` : st.strokeDasharray ? ` stroke-dasharray="${st.strokeDasharray}"` : "";

  const parts: string[] = [`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">`];
  parts.push(
    `<rect width="${b.w}" height="${b.h}" rx="6" ry="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`
  );
  const cx = b.w / 2;
  let ty = 0;
  if (c.stereotype) {
    ty = STEREO_H - 3;
    parts.push(
      `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="${BODY_SIZE - 1}" font-style="italic" fill="${DOC_COLOR}">${xml(`«${c.stereotype}»`)}</text>`
    );
  }
  const titleBaseline = (c.stereotype ? STEREO_H : 0) + 16;
  parts.push(
    `<text x="${cx}" y="${titleBaseline}" text-anchor="middle" font-size="${TITLE_SIZE}" font-weight="700" fill="${color}">${xml(c.name)}</text>`
  );

  if (b.body.length > 0) {
    parts.push(`<line x1="0" y1="${b.headerH}" x2="${b.w}" y2="${b.headerH}" stroke="${stroke}" stroke-width="1"/>`);
    b.body.forEach((l, i) => {
      const ly = b.headerH + PAD_Y + 12 + i * LINE_H;
      const extra = l.kind === "doc" ? ` font-style="italic" fill="${DOC_COLOR}"` : ` fill="${color}"`;
      parts.push(`<text x="${PAD_X}" y="${ly}" font-size="${BODY_SIZE}"${extra}>${xml(l.text)}</text>`);
    });
  }
  parts.push(`</g>`);
  return parts.join("\n");
}

function drawEdge(e: EdgeGeom): string {
  const pts = e.points;
  if (pts.length < 2) return "";
  const out: string[] = [
    `<path d="${path(pts)}" fill="none" stroke="${EDGE_COLOR}" stroke-width="1.3" ${edgeAttrs(e.rel.kind)}/>`,
  ];
  // Relation label at the midpoint; multiplicity near the target end.
  const mid = pts[Math.floor(pts.length / 2)];
  if (e.rel.label) out.push(textBadge(e.rel.label, mid.x, mid.y));
  if (e.rel.multiplicity) {
    const t = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dy = t.y > prev.y ? -8 : 14; // sit just outside the target box
    out.push(textBadge(e.rel.multiplicity, t.x + 10, t.y + dy));
  }
  return out.join("\n");
}

/** A small text label with a white backing so it stays readable over edges/boxes. */
function textBadge(text: string, x: number, y: number): string {
  const w = textWidth(text, BODY_SIZE - 1) + 6;
  return (
    `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">` +
    `<rect x="${(-w / 2).toFixed(1)}" y="-9" width="${w.toFixed(1)}" height="15" rx="2" fill="#ffffff" fill-opacity="0.85"/>` +
    `<text x="0" y="2" text-anchor="middle" font-size="${BODY_SIZE - 1}" fill="${DOC_COLOR}">${xml(text)}</text>` +
    `</g>`
  );
}

/** Render a class model as a standalone SVG document, laid out with dagre. */
export function classToSvg(model: ClassModel, opts: { direction?: "TB" | "LR" | "BT" | "RL" } = {}): string {
  const boxes = new Map<string, Box>();
  for (const c of model.classes) boxes.set(c.id, layoutBox(c));

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: opts.direction ?? "TB", nodesep: 45, ranksep: 55, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  // Ensure every relation endpoint has a node (externals are usually already in
  // model.classes; synthesise a bare box otherwise so the layout stays connected).
  const ensure = (id: string) => {
    if (boxes.has(id)) return;
    const b = layoutBox({ id, name: id, members: [], literals: [], external: true });
    boxes.set(id, b);
  };
  for (const r of model.relations) {
    ensure(r.source);
    ensure(r.target);
  }
  for (const [id, b] of boxes) g.setNode(id, { width: b.w, height: b.h });

  // dagre ranks the edge source above the target; pick the direction that puts the
  // conventional parent on top (superclass / whole), then draw markers semantically.
  interface Wired {
    rel: ClassRelation;
    v: string;
    w: string;
    name: string;
    reversed: boolean;
  }
  const wired: Wired[] = model.relations.map((r, i) => {
    const reversed = r.kind === "inheritance"; // base(target) should rank above derived(source)
    const v = reversed ? r.target : r.source;
    const w = reversed ? r.source : r.target;
    g.setEdge(v, w, {}, `e${i}`);
    return { rel: r, v, w, name: `e${i}`, reversed };
  });

  dagre.layout(g);

  const graph = g.graph();
  const W = Math.ceil(graph.width ?? 0);
  const H = Math.ceil(graph.height ?? 0);

  const edgeSvg = wired
    .map((e) => {
      const ge = g.edge(e.v, e.w, e.name) as { points: { x: number; y: number }[] };
      const pts = e.reversed ? [...ge.points].reverse() : ge.points; // back to IR source→target order
      return drawEdge({ rel: e.rel, points: pts });
    })
    .join("\n");

  const nodeSvg = [...boxes.entries()]
    .map(([id, b]) => {
      const nd = g.node(id) as { x: number; y: number };
      return drawNode(b, nd.x - b.w / 2, nd.y - b.h / 2);
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}'>
${defs()}
<g class="edges">
${edgeSvg}
</g>
<g class="nodes">
${nodeSvg}
</g>
</svg>`;
}
