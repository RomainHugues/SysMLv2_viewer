import type { StateModel, StateMachine } from "./ir";

export interface StateOptions {
  direction: "TB" | "LR" | "BT" | "RL";
}

function sanitize(name: string): string {
  const s = name.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(s) ? s : "s_" + s;
}

function machineLines(machine: StateMachine, indent: string): string[] {
  const lines: string[] = [];
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
    // declare an alias when the safe id differs from the display name
    if (cand !== name) lines.push(`${indent}state "${name}" as ${cand}`);
    return cand;
  };

  const touched = new Set<string>();
  const rendered: string[] = [];
  for (const t of machine.transitions) {
    const from = t.source ? idOf(t.source) : "[*]";
    const to = t.target ? idOf(t.target) : "[*]";
    if (t.source) touched.add(t.source);
    if (t.target) touched.add(t.target);
    rendered.push(`${indent}${from} --> ${to}${t.label ? " : " + t.label : ""}`);
  }
  // declare isolated states (not touched by any transition)
  for (const st of machine.states) {
    if (!touched.has(st.name)) idOf(st.name); // emits alias or just reserves id
    if (!touched.has(st.name) && sanitize(st.name) === st.name) lines.push(`${indent}${idOf(st.name)}`);
  }
  lines.push(...rendered);
  return lines;
}

/** Render a state model as Mermaid `stateDiagram-v2` text. */
export function stateToMermaid(model: StateModel, opts: StateOptions): string {
  const dir = opts.direction === "LR" || opts.direction === "RL" ? "LR" : "TB";
  const lines: string[] = ["stateDiagram-v2", `  direction ${dir}`];

  for (const machine of model.machines) {
    const id = sanitize(machine.name);
    lines.push(`  state ${id} {`);
    lines.push(...machineLines(machine, "    "));
    lines.push(`  }`);
  }

  return lines.join("\n");
}
