import type { SysmlNode } from "../../sysml/parser";
import type { GanttModel, GanttTask } from "./ir";
import { childNodes, nameOf, qnOf, cstText, scopedDescendants } from "../ast";
import { schedule } from "./schedule";

const ACTION = new Set(["ActionUsage", "PerformActionUsage"]);
const BEHAVIOUR = new Set(["ActionDefinition", "ActionUsage", "PerformActionUsage"]);
// stop recursion at these so each action is a leaf activity (don't descend into its body)
const STOP = new Set([
  "ActionUsage", "ActionDefinition", "PerformActionUsage", "SuccessionAsUsage",
  "TransitionUsage", "DecisionNode", "ForkNode", "JoinNode", "MergeNode",
]);

// Distinct colours per resource.
const PALETTE = ["#4e79a7", "#59a14f", "#e15759", "#f28e2b", "#76b7b2", "#b07aa1", "#edc948", "#9c755f"];
const UNASSIGNED = "#bdbdbd";

function topBehaviours(pkg: SysmlNode): SysmlNode[] {
  const out: SysmlNode[] = [];
  for (const member of childNodes(pkg)) {
    for (const el of [member, ...childNodes(member)]) if (BEHAVIOUR.has(el.$type)) out.push(el);
  }
  return out;
}

/** Owned attribute value text, e.g. `attribute duration = 3;` -> "3"; quotes stripped. */
function attrText(action: SysmlNode, name: string): string | undefined {
  for (const c of childNodes(action)) {
    for (const g of [c, ...childNodes(c)]) {
      if (/AttributeUsage$/.test(g.$type) && nameOf(g) === name) {
        const m = cstText(g).match(/=\s*([^;{]+)/);
        return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
      }
    }
  }
  return undefined;
}

function endpointsFromText(succ: SysmlNode): [string?, string?] {
  const text = cstText(succ);
  let m = text.match(/first\s+(\S+)\s+then\s+(\S+)/i);
  if (m) return [m[1], m[2].replace(/[;{].*$/, "")];
  m = text.match(/then\s+(\S+)/i);
  if (m) return [undefined, m[1].replace(/[;{].*$/, "")];
  return [undefined, undefined];
}

export function extractGantt(pkg: SysmlNode): GanttModel {
  const tasks: GanttTask[] = [];
  const byKey = new Map<string, GanttTask>(); // qn AND short name -> task
  let counter = 0;

  const addActivity = (el: SysmlNode): GanttTask => {
    const qn = qnOf(el);
    const name = nameOf(el);
    const existing = (qn && byKey.get(qn)) || byKey.get(name);
    if (existing) return existing;
    const durTxt = attrText(el, "duration");
    const dur = durTxt !== undefined ? parseFloat(durTxt) : NaN;
    const task: GanttTask = {
      id: `t${counter++}`,
      name,
      duration: isFinite(dur) && dur > 0 ? dur : 1,
      resource: attrText(el, "resource") ?? "",
      deps: [],
      start: 0,
      critical: false,
    };
    tasks.push(task);
    if (qn) byKey.set(qn, task);
    byKey.set(name, task);
    return task;
  };

  for (const behaviour of topBehaviours(pkg)) {
    for (const el of scopedDescendants(behaviour, STOP)) if (ACTION.has(el.$type)) addActivity(el);
  }

  // dependencies from successions: `first src then tgt` => tgt depends on src
  for (const behaviour of topBehaviours(pkg)) {
    for (const succ of scopedDescendants(behaviour, STOP)) {
      if (succ.$type !== "SuccessionAsUsage") continue;
      let srcKey: string | undefined;
      let tgtKey: string | undefined;
      try {
        const related = succ.$meta?.relatedFeatures?.() ?? [];
        if (related[0]) srcKey = related[0].qualifiedName ?? related[0].name;
        const last = related[related.length - 1];
        if (related.length >= 2 && last) tgtKey = last.qualifiedName ?? last.name;
      } catch {
        /* fall back to text */
      }
      const [srcText, tgtText] = endpointsFromText(succ);
      const src = (srcKey && byKey.get(srcKey)) || (srcText && byKey.get(srcText));
      const tgt = (tgtKey && byKey.get(tgtKey)) || (tgtText && byKey.get(tgtText));
      if (src && tgt && src !== tgt && !tgt.deps.includes(src.id)) tgt.deps.push(src.id);
    }
  }

  // schedule + critical path
  const { start, critical } = schedule(tasks.map((t) => ({ id: t.id, duration: t.duration, deps: t.deps })));
  for (const t of tasks) {
    t.start = start.get(t.id) ?? 0;
    t.critical = critical.has(t.id);
  }

  // assign a colour per resource
  const resourceColors: Record<string, string> = {};
  let ci = 0;
  for (const t of tasks) {
    if (!t.resource) continue;
    if (!(t.resource in resourceColors)) resourceColors[t.resource] = PALETTE[ci++ % PALETTE.length];
  }
  resourceColors[""] = UNASSIGNED;

  return { tasks, resourceColors };
}
