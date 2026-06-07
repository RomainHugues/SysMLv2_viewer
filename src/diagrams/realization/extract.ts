import type { SysmlNode } from "../../sysml/parser";
import type { RealModel, RealNode, RealEdge, RealLevel } from "./ir";
import { styleInfo, childNodes, nameOf, qnOf, cstText, scopedDescendants } from "../ast";
import { matchStyle, type StyleSheet } from "../../style/style";

// Engineering levels, most abstract first. An element's level is the first whose
// `types` appears in the element's conformed-type chain (Arcadia / NAF profiles).
const LEVELS: Array<{ key: string; label: string; types: string[] }> = [
  { key: "operational", label: "Operational / Concepts", types: ["OperationalEntity", "OperationalActivity", "Capability"] },
  { key: "system", label: "System / Service", types: ["SystemComponent", "SystemFunction", "Service", "ServiceFunction"] },
  { key: "logical", label: "Logical", types: ["LogicalComponent", "LogicalFunction", "LogicalNode"] },
  { key: "physical", label: "Physical", types: ["PhysicalComponent", "PhysicalFunction", "PhysicalNode", "PhysicalResource"] },
];
const OTHER = { key: "other", label: "Other", types: [] as string[] };

function levelOf(el: SysmlNode): { key: string; label: string; type?: string } {
  const chain = styleInfo(el).typeChain;
  for (const lvl of LEVELS) {
    const hit = lvl.types.find((t) => chain.includes(t));
    if (hit) return { key: lvl.key, label: lvl.label, type: hit };
  }
  return { key: OTHER.key, label: OTHER.label };
}

/** Last identifier of a reference's text, e.g. "Pkg::Stabilize" -> "Stabilize". */
function refName(node: SysmlNode): string {
  const seg = cstText(node).trim().split(/\s+/)[0]?.split("::") ?? [];
  return seg[seg.length - 1] ?? "";
}

/** Map every named definition/usage by short name (first wins). */
function nameIndex(pkg: SysmlNode): Map<string, SysmlNode> {
  const byName = new Map<string, SysmlNode>();
  const seen = new Set<SysmlNode>();
  const walk = (n: SysmlNode): void => {
    for (const c of childNodes(n)) {
      if (seen.has(c)) continue;
      seen.add(c);
      if (/(Definition|Usage)$/.test(c.$type) && (c as any).declaredName && !byName.has(nameOf(c))) {
        byName.set(nameOf(c), c);
      }
      walk(c);
    }
  };
  walk(pkg);
  return byName;
}

export function extractRealization(pkg: SysmlNode, styleSheet?: StyleSheet): RealModel {
  const byName = nameIndex(pkg);
  const nodes = new Map<string, RealNode>();
  const edges: RealEdge[] = [];

  const ensure = (name: string): string => {
    const el = byName.get(name);
    const id = el ? qnOf(el) ?? name : name;
    if (!nodes.has(id)) {
      const lvl = el ? levelOf(el) : { key: OTHER.key, label: OTHER.label, type: undefined };
      nodes.set(id, {
        id,
        name,
        level: lvl.key,
        type: lvl.type,
        style: el ? matchStyle(styleSheet, styleInfo(el)) : undefined,
      });
    }
    return id;
  };

  // Realization / traceability = SysML dependencies (realize / trace / refine / ...).
  for (const dep of scopedDescendants(pkg, new Set())) {
    if (dep.$type !== "Dependency") continue;
    const clients: SysmlNode[] = (dep as any).client ?? [];
    const suppliers: SysmlNode[] = (dep as any).supplier ?? [];
    const label = (dep.declaredName as string) || undefined;
    for (const cl of clients) {
      for (const su of suppliers) {
        const a = refName(cl);
        const b = refName(su);
        if (!a || !b) continue;
        edges.push({ source: ensure(a), target: ensure(b), label });
      }
    }
  }

  // group nodes into ordered, non-empty lanes
  const order = [...LEVELS.map((l) => ({ key: l.key, label: l.label })), { key: OTHER.key, label: OTHER.label }];
  const levels: RealLevel[] = [];
  for (const { key, label } of order) {
    const ns = [...nodes.values()].filter((n) => n.level === key);
    if (ns.length) levels.push({ key, label, nodes: ns });
  }

  return { levels, edges };
}
