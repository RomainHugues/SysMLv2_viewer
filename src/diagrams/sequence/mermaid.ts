import type { SequenceModel } from "./ir";

function sanitize(name: string): string {
  const s = name.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(s) ? s : "p_" + s;
}

/** Render a sequence model as Mermaid `sequenceDiagram` text. */
export function sequenceToMermaid(model: SequenceModel): string {
  const lines: string[] = ["sequenceDiagram"];

  const safe = new Map<string, string>();
  const used = new Set<string>();
  const idOf = (name: string): string => {
    let s = safe.get(name);
    if (s) return s;
    let base = sanitize(name);
    let cand = base;
    let i = 1;
    while (used.has(cand)) cand = `${base}_${i++}`;
    used.add(cand);
    safe.set(name, cand);
    return cand;
  };

  // Mermaid can only color participants via `box <color> … end` groups, so each
  // styled participant gets its own one-participant colored box.
  for (const p of model.participants) {
    const id = idOf(p.name);
    const decl = id === p.name ? `participant ${id}` : `participant ${id} as ${p.name}`;
    if (p.style?.fill) {
      lines.push(`  box ${p.style.fill} ${p.name}`);
      lines.push(`    ${decl}`);
      lines.push(`  end`);
    } else {
      lines.push(`  ${decl}`);
    }
  }

  for (const m of model.messages) {
    const label = m.label && m.label.trim() ? m.label.replace(/[\r\n]+/g, " ") : "—";
    lines.push(`  ${idOf(m.from)}->>${idOf(m.to)}: ${label}`);
  }

  return lines.join("\n");
}
