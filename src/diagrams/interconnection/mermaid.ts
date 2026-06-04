import type { IbdModel, IbdPort } from "./ir";

export interface IbdOptions {
  direction: "TB" | "LR" | "BT" | "RL";
}

function esc(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/[\r\n]+/g, " ");
}

/** Port label with a direction marker (▸ in / out ▸) and optional type. */
function portLabel(p: IbdPort): string {
  const t = p.type ? `: ${p.type}` : "";
  if (p.direction === "in") return `▸ ${p.name}${t}`;
  if (p.direction === "out") return `${p.name}${t} ▸`;
  if (p.direction === "inout") return `◂ ${p.name}${t} ▸`;
  return `${p.name}${t}`;
}

/** Render an interconnection (IBD) model as Mermaid `flowchart` text. */
export function ibdToMermaid(model: IbdModel, _opts: IbdOptions): string {
  // Internal block diagrams read best left-to-right (ports on the sides).
  const lines: string[] = ["flowchart LR"];
  let counter = 0;
  const portId = new Map<string, string>(); // `${gi}:${block}.${port}` -> safe id
  const blockSub = new Map<string, string>(); // `${gi}:${block}` -> subgraph id
  const blockNode = new Map<string, string>(); // `${gi}:${block}` -> node id (portless block)
  const styleStmts: string[] = [];

  model.groups.forEach((g, gi) => {
    lines.push(`  subgraph grp${gi}["${esc(g.label)}"]`);
    lines.push(`    direction LR`);
    for (const b of g.blocks) {
      const bkey = `${gi}:${b.id}`;
      const title = b.type ? `${b.name} : ${b.type}` : b.name;
      if (b.ports.length === 0) {
        const id = `n${counter++}`;
        blockNode.set(bkey, id);
        lines.push(`    ${id}["${esc(title)}"]`);
      } else {
        const sid = `b${counter++}`;
        blockSub.set(bkey, sid);
        lines.push(`    subgraph ${sid}["${esc(title)}"]`);
        lines.push(`      direction TB`);
        for (const p of b.ports) {
          const id = `n${counter++}`;
          portId.set(`${gi}:${b.id}.${p.id}`, id);
          lines.push(`      ${id}(["${esc(portLabel(p))}"])`);
          styleStmts.push(`  style ${id} fill:#eef3fb,stroke:#5b7aa8`);
        }
        lines.push(`    end`);
      }
    }
    lines.push(`  end`);
  });

  const linkStmts: string[] = [];
  let edgeIndex = 0;
  model.groups.forEach((g, gi) => {
    const endpoint = (block: string, port?: string): string | undefined => {
      if (port) {
        const id = portId.get(`${gi}:${block}.${port}`);
        if (id) return id;
      }
      return blockNode.get(`${gi}:${block}`) ?? blockSub.get(`${gi}:${block}`);
    };
    for (const c of g.connectors) {
      const s = endpoint(c.source.block, c.source.port);
      const t = endpoint(c.target.block, c.target.port);
      if (!s || !t) continue;
      const lbl = c.label ? `|"${esc(c.label)}"|` : "";
      let link: string;
      if (c.kind === "flow") {
        link = `-->${lbl}`; // directed item flow
        linkStmts.push(`  linkStyle ${edgeIndex} stroke:#2e7d32,stroke-width:2px`);
      } else if (c.kind === "interface") {
        link = `===${lbl}`; // interface = thick connector
        linkStmts.push(`  linkStyle ${edgeIndex} stroke:#6a1b9a,stroke-width:3px`);
      } else {
        link = lbl ? `---${lbl}` : `---`; // plain connection
      }
      lines.push(`  ${s} ${link} ${t}`);
      edgeIndex++;
    }
  });

  lines.push(...styleStmts, ...linkStmts);
  return lines.join("\n");
}
