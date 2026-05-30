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

  for (const p of model.participants) {
    const id = idOf(p.name);
    lines.push(id === p.name ? `  participant ${id}` : `  participant ${id} as ${p.name}`);
  }

  for (const m of model.messages) {
    const label = m.label && m.label.trim() ? m.label.replace(/[\r\n]+/g, " ") : "—";
    lines.push(`  ${idOf(m.from)}->>${idOf(m.to)}: ${label}`);
  }

  return lines.join("\n");
}
