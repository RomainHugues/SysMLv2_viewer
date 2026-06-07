// Critical Path Method on the activity DAG: earliest-start forward pass + latest-
// finish backward pass; a task with zero slack is on the critical path. Cycle-safe
// (back-edges contribute nothing) so a looping activity flow never hangs.

export interface SchedInput {
  id: string;
  duration: number;
  deps: string[]; // predecessor ids
}
export interface SchedResult {
  start: Map<string, number>; // earliest start (days)
  critical: Set<string>;
}

export function schedule(tasks: SchedInput[]): SchedResult {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dur = (id: string) => byId.get(id)?.duration ?? 0;

  const succs = new Map<string, string[]>(tasks.map((t) => [t.id, []]));
  for (const t of tasks) for (const d of t.deps) succs.get(d)?.push(t.id);

  const es = new Map<string, number>();
  const fwd = new Set<string>();
  const earliestStart = (id: string): number => {
    const cached = es.get(id);
    if (cached !== undefined) return cached;
    if (fwd.has(id)) return 0; // cycle
    fwd.add(id);
    let s = 0;
    for (const d of byId.get(id)!.deps) if (byId.has(d)) s = Math.max(s, earliestStart(d) + dur(d));
    fwd.delete(id);
    es.set(id, s);
    return s;
  };
  for (const t of tasks) earliestStart(t.id);

  const projectFinish = tasks.reduce((m, t) => Math.max(m, es.get(t.id)! + t.duration), 0);

  const lf = new Map<string, number>();
  const bwd = new Set<string>();
  const latestFinish = (id: string): number => {
    const cached = lf.get(id);
    if (cached !== undefined) return cached;
    if (bwd.has(id)) return projectFinish; // cycle
    bwd.add(id);
    const ss = succs.get(id) ?? [];
    let f = ss.length ? Infinity : projectFinish;
    for (const s of ss) f = Math.min(f, latestFinish(s) - dur(s));
    bwd.delete(id);
    if (!isFinite(f)) f = projectFinish;
    lf.set(id, f);
    return f;
  };
  for (const t of tasks) latestFinish(t.id);

  const start = new Map<string, number>();
  const critical = new Set<string>();
  for (const t of tasks) {
    const e = es.get(t.id)!;
    start.set(t.id, e);
    if (Math.abs(lf.get(t.id)! - t.duration - e) < 1e-9) critical.add(t.id);
  }
  return { start, critical };
}
