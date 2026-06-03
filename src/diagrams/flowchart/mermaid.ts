import type { FlowModel, FlowNode, FlowNodeKind } from "../ir";

export interface FlowchartOptions {
  direction: "TB" | "LR" | "BT" | "RL";
}

// Distinct, bold colours for functional chains (Capella-style highlighting).
const PALETTE = ["#d62728", "#1f77b4", "#2ca02c", "#9467bd", "#ff7f0e", "#17becf", "#8c564b", "#e377c2"];
const SHARED_STROKE = "#111111"; // functions/flows shared by several chains
const PERFORM_STROKE = "#9e9e9e"; // dashed allocation link (action performed by a part)

// Built-in colour code by node kind, applied even with no style file so actions,
// control nodes and parts are distinguishable by default. A style file overrides it
// (its fill/stroke take precedence; see nodeStyle).
const DEFAULT_STYLE: Record<FlowNodeKind, { fill: string; stroke: string }> = {
  action: { fill: "#e8f1fb", stroke: "#1f6fb2" }, // functions: blue
  decision: { fill: "#fff4e5", stroke: "#e08600" },
  merge: { fill: "#fff4e5", stroke: "#e08600" },
  fork: { fill: "#fff4e5", stroke: "#e08600" }, // control nodes: amber
  join: { fill: "#fff4e5", stroke: "#e08600" },
  accept: { fill: "#f1e7fb", stroke: "#7b3fb0" },
  send: { fill: "#f1e7fb", stroke: "#7b3fb0" }, // events: purple
  start: { fill: "#eceff1", stroke: "#607d8b" },
  end: { fill: "#eceff1", stroke: "#607d8b" },
  part: { fill: "#e7f5e9", stroke: "#2e9e4f" }, // performer components: green
};

/** Escape a label for use inside a Mermaid quoted string. */
function esc(label: string): string {
  return label.replace(/"/g, "&quot;").replace(/[\r\n]+/g, " ");
}

/** Wrap a node label in the Mermaid shape for its kind. */
function shape(safeId: string, node: FlowNode): string {
  const l = `"${esc(node.label)}"`;
  switch (node.kind) {
    case "decision":
    case "merge":
      return `${safeId}{${l}}`;
    case "fork":
    case "join":
      return `${safeId}[/${l}/]`;
    case "accept":
      return `${safeId}>${l}]`;
    case "send":
      return `${safeId}[\\${l}\\]`;
    case "start":
    case "end":
      return `${safeId}((${l}))`;
    case "part":
      return `${safeId}[[${l}]]`; // subroutine shape ~ a component
    case "action":
    default:
      return `${safeId}[${l}]`;
  }
}

/** Render a flow model as Mermaid `flowchart` text. */
export function flowToMermaid(model: FlowModel, opts: FlowchartOptions): string {
  const lines: string[] = [`flowchart ${opts.direction}`];

  // Assign Mermaid-safe ids (qualified names contain "::" which is illegal).
  const safe = new Map<string, string>();
  let counter = 0;
  const safeId = (logicalId: string): string => {
    let id = safe.get(logicalId);
    if (!id) {
      id = `n${counter++}`;
      safe.set(logicalId, id);
    }
    return id;
  };

  // Functional chains -> a distinct bold colour each (assigned from the palette).
  const allChains = [...new Set(model.groups.flatMap((g) => g.nodes.flatMap((n) => n.chains ?? [])))].sort();
  const chainColor = (name: string): string => PALETTE[allChains.indexOf(name) % PALETTE.length];

  const nodeStyle = (node: FlowNode): string => {
    const def = DEFAULT_STYLE[node.kind];
    // Fill: style file wins, else the built-in colour for this kind.
    const fill = node.style?.fill ?? def.fill;
    // Stroke: a functional-chain border wins, else the style file, else the kind default.
    let stroke: string;
    let width: string | undefined;
    if (node.chains && node.chains.length === 1) {
      stroke = chainColor(node.chains[0]);
      width = "4px";
    } else if (node.chains && node.chains.length > 1) {
      stroke = SHARED_STROKE;
      width = "6px"; // shared function (junction of several chains)
    } else {
      stroke = node.style?.stroke ?? def.stroke;
      width = node.style?.strokeWidth;
    }
    const parts = [`fill:${fill}`, `stroke:${stroke}`];
    if (width) parts.push(`stroke-width:${width}`);
    if (node.style?.color) parts.push(`color:${node.style.color}`);
    return parts.join(",");
  };

  const styleStmts: string[] = [];
  const linkStmts: string[] = [];
  let edgeIndex = 0; // Mermaid numbers links globally in declaration order

  model.groups.forEach((group, gi) => {
    lines.push(`  subgraph g${gi} ["${esc(group.label)}"]`);
    lines.push(`    direction ${opts.direction}`);
    for (const node of group.nodes) {
      const id = safeId(node.id);
      lines.push(`    ${shape(id, node)}`);
      styleStmts.push(`  style ${id} ${nodeStyle(node)}`);
    }
    for (const edge of group.edges) {
      const s = safeId(edge.source);
      const t = safeId(edge.target);
      if (edge.kind === "perform") {
        // allocation: action ‑‑▶ part (dashed, greyed, does not belong to a chain)
        lines.push(`    ${s} -.-> ${t}`);
        linkStmts.push(`  linkStyle ${edgeIndex} stroke:${PERFORM_STROKE},stroke-width:1.5px`);
      } else {
        const label = edge.label ? `-->|"${esc(edge.label)}"|` : "-->";
        lines.push(`    ${s} ${label} ${t}`);
        if (edge.chains && edge.chains.length === 1) {
          linkStmts.push(`  linkStyle ${edgeIndex} stroke:${chainColor(edge.chains[0])},stroke-width:3px`);
        } else if (edge.chains && edge.chains.length > 1) {
          linkStmts.push(`  linkStyle ${edgeIndex} stroke:${SHARED_STROKE},stroke-width:4px`);
        }
      }
      edgeIndex++;
    }
    lines.push(`  end`);
  });

  // Legend of functional chains (when any are present).
  const hasShared = model.groups.some((g) => g.nodes.some((n) => (n.chains?.length ?? 0) > 1));
  if (allChains.length > 0) {
    lines.push(`  subgraph chainsLegend ["Functional chains"]`);
    lines.push(`    direction TB`);
    allChains.forEach((_, i) => lines.push(`    lc${i}["${esc(allChains[i])}"]`));
    if (hasShared) lines.push(`    lcShared["shared by several chains"]`);
    lines.push(`  end`);
    allChains.forEach((c, i) => styleStmts.push(`  style lc${i} fill:#ffffff,stroke:${chainColor(c)},stroke-width:4px`));
    if (hasShared) styleStmts.push(`  style lcShared fill:#ffffff,stroke:${SHARED_STROKE},stroke-width:6px`);
  }

  // Legend of the default colour code (when performer parts are shown).
  const hasParts = model.groups.some((g) => g.nodes.some((n) => n.kind === "part"));
  if (hasParts) {
    lines.push(`  subgraph kindLegend ["Legend"]`);
    lines.push(`    direction LR`);
    lines.push(`    klAction["action"]`);
    lines.push(`    klPart[["part"]]`);
    lines.push(`    klAction -.->|"performed by"| klPart`);
    lines.push(`  end`);
    styleStmts.push(`  style klAction fill:${DEFAULT_STYLE.action.fill},stroke:${DEFAULT_STYLE.action.stroke}`);
    styleStmts.push(`  style klPart fill:${DEFAULT_STYLE.part.fill},stroke:${DEFAULT_STYLE.part.stroke}`);
    linkStmts.push(`  linkStyle ${edgeIndex} stroke:${PERFORM_STROKE},stroke-width:1.5px`);
    edgeIndex++;
  }

  lines.push(...styleStmts, ...linkStmts);
  return lines.join("\n");
}
