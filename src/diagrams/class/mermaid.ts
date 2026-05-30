import type { ClassModel, ClassNode } from "./ir";

function sanitize(name: string): string {
  const s = name.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(s) ? s : "c_" + s;
}

/** Render a class model as Mermaid `classDiagram` text. */
export function classToMermaid(model: ClassModel): string {
  const lines: string[] = ["classDiagram"];

  // Map logical ids -> unique Mermaid-safe class ids (based on the short name).
  const safe = new Map<string, string>();
  const used = new Set<string>();
  const safeId = (id: string, name: string): string => {
    let s = safe.get(id);
    if (s) return s;
    let base = sanitize(name);
    let candidate = base;
    let i = 1;
    while (used.has(candidate)) candidate = `${base}_${i++}`;
    used.add(candidate);
    safe.set(id, candidate);
    return s ?? candidate;
  };
  // pre-assign ids so relations and classes agree
  for (const c of model.classes) safeId(c.id, c.name);

  const idFor = (logicalId: string) => safe.get(logicalId) ?? sanitize(logicalId);

  for (const c of model.classes) {
    const sid = idFor(c.id);
    const body: string[] = [];
    if (c.stereotype) body.push(`    <<${c.stereotype}>>`);
    for (const lit of c.literals) body.push(`    ${lit}`);
    for (const m of c.members) body.push(`    +${m.name}${m.type ? " : " + m.type : ""}`);

    if (body.length > 0) {
      lines.push(`  class ${sid} {`);
      lines.push(...body);
      lines.push(`  }`);
    } else {
      lines.push(`  class ${sid}`);
    }
  }

  for (const r of model.relations) {
    const a = idFor(r.source);
    const b = idFor(r.target);
    if (r.kind === "inheritance") {
      // `Base <|-- Derived`
      lines.push(`  ${b} <|-- ${a}`);
    } else {
      const arrow = r.kind === "composition" ? "*--" : "-->";
      // multiplicity belongs to the target end (e.g. a Vehicle has "4" Wheels)
      const mult = r.multiplicity ? `"${r.multiplicity}" ` : "";
      const label = r.label ? ` : ${r.label}` : "";
      lines.push(`  ${a} ${arrow} ${mult}${b}${label}`);
    }
  }

  return lines.join("\n");
}
