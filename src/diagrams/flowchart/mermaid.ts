import type { FlowModel, FlowNode } from "../ir";

export interface FlowchartOptions {
  direction: "TB" | "LR" | "BT" | "RL";
}

// Distinct, bold colours for functional chains (Capella-style highlighting).
const PALETTE = ["#d62728", "#1f77b4", "#2ca02c", "#9467bd", "#ff7f0e", "#17becf", "#8c564b", "#e377c2"];
const SHARED_STROKE = "#111111"; // functions/flows shared by several chains

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

  const nodeStyle = (node: FlowNode): string | undefined => {
    const parts: string[] = [];
    let stroke: string | undefined;
    let width: string | undefined;
    if (node.chains && node.chains.length === 1) {
      stroke = chainColor(node.chains[0]);
      width = "4px";
    } else if (node.chains && node.chains.length > 1) {
      stroke = SHARED_STROKE;
      width = "6px"; // shared function (junction of several chains)
    } else {
      stroke = node.style?.stroke;
      width = node.style?.strokeWidth;
    }
    if (node.style?.fill) parts.push(`fill:${node.style.fill}`);
    if (stroke) parts.push(`stroke:${stroke}`);
    if (width) parts.push(`stroke-width:${width}`);
    if (node.style?.color) parts.push(`color:${node.style.color}`);
    return parts.length ? parts.join(",") : undefined;
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
      const s = nodeStyle(node);
      if (s) styleStmts.push(`  style ${id} ${s}`);
    }
    for (const edge of group.edges) {
      const s = safeId(edge.source);
      const t = safeId(edge.target);
      const label = edge.label ? `-->|"${esc(edge.label)}"|` : "-->";
      lines.push(`    ${s} ${label} ${t}`);
      if (edge.chains && edge.chains.length === 1) {
        linkStmts.push(`  linkStyle ${edgeIndex} stroke:${chainColor(edge.chains[0])},stroke-width:3px`);
      } else if (edge.chains && edge.chains.length > 1) {
        linkStmts.push(`  linkStyle ${edgeIndex} stroke:${SHARED_STROKE},stroke-width:4px`);
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

  lines.push(...styleStmts, ...linkStmts);
  return lines.join("\n");
}
