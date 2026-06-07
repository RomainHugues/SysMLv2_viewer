import type { RealModel } from "./ir";

// Built-in per-level colours (used when no style file is active). A style file's
// own fill/stroke takes precedence so Arcadia/NAF colours show through.
const LEVEL_FILL: Record<string, string> = {
  operational: "#f8cbad", system: "#dbdbdb", logical: "#bdd7ee", physical: "#ffe699", other: "#f5f5f5",
};
const LEVEL_STROKE: Record<string, string> = {
  operational: "#c55a11", system: "#7f7f7f", logical: "#2e75b6", physical: "#bf9000", other: "#9e9e9e",
};
const REALIZE_STROKE = "#6a1b9a";

function esc(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/[\r\n]+/g, " ");
}

/** Render a realization model as a layered Mermaid `flowchart` (lanes per level). */
export function realizationToMermaid(model: RealModel): string {
  // Bottom-to-top: realization arrows point up toward the element they realize, so
  // the more abstract levels (Operational) settle at the top, concrete at the bottom.
  const lines: string[] = ["flowchart BT"];
  const safe = new Map<string, string>();
  let counter = 0;
  const idOf = (logical: string): string | undefined => safe.get(logical);

  const styleStmts: string[] = [];
  for (const lvl of model.levels) {
    lines.push(`  subgraph L_${lvl.key}["${esc(lvl.label)}"]`);
    lines.push(`    direction LR`);
    for (const node of lvl.nodes) {
      const id = `n${counter++}`;
      safe.set(node.id, id);
      const label = node.type ? `${node.name} «${node.type}»` : node.name;
      lines.push(`    ${id}["${esc(label)}"]`);
      const fill = node.style?.fill ?? LEVEL_FILL[lvl.key] ?? LEVEL_FILL.other;
      const stroke = node.style?.stroke ?? LEVEL_STROKE[lvl.key] ?? LEVEL_STROKE.other;
      const color = node.style?.color ? `,color:${node.style.color}` : "";
      styleStmts.push(`  style ${id} fill:${fill},stroke:${stroke}${color}`);
    }
    lines.push(`  end`);
  }

  const linkStmts: string[] = [];
  let edgeIndex = 0;
  for (const e of model.edges) {
    const s = idOf(e.source);
    const t = idOf(e.target);
    if (!s || !t) continue;
    const lbl = e.label ? `|"${esc(e.label)}"|` : "";
    lines.push(`  ${s} -.->${lbl} ${t}`); // realization / trace: dashed
    linkStmts.push(`  linkStyle ${edgeIndex} stroke:${REALIZE_STROKE},stroke-width:1.5px`);
    edgeIndex++;
  }

  lines.push(...styleStmts, ...linkStmts);
  return lines.join("\n");
}
