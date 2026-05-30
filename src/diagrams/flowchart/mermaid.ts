import type { FlowModel, FlowNode } from "../ir";
import { buildClassDefs } from "../../style/style";

export interface FlowchartOptions {
  direction: "TB" | "LR" | "BT" | "RL";
}

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

  const { classNameFor, classDefLines } = buildClassDefs();
  const classAssignments: string[] = [];

  model.groups.forEach((group, gi) => {
    lines.push(`  subgraph g${gi} ["${esc(group.label)}"]`);
    lines.push(`    direction ${opts.direction}`);
    for (const node of group.nodes) {
      const id = safeId(node.id);
      lines.push(`    ${shape(id, node)}`);
      const cls = classNameFor(node.style);
      if (cls) classAssignments.push(`  class ${id} ${cls}`);
    }
    for (const edge of group.edges) {
      const s = safeId(edge.source);
      const t = safeId(edge.target);
      const label = edge.label ? `-->|"${esc(edge.label)}"|` : "-->";
      lines.push(`    ${s} ${label} ${t}`);
    }
    lines.push(`  end`);
  });

  // classDef declarations + per-node class assignments (after subgraphs).
  for (const def of classDefLines()) lines.push(`  ${def}`);
  lines.push(...classAssignments);

  return lines.join("\n");
}
