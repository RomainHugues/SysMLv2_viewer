import type { SysmlNode } from "../../sysml/parser";
import type { ClassModel, ClassNode, ClassRelation, ClassMember } from "./ir";
import { styleInfo, docOf } from "../ast";
import { matchStyle, type StyleSheet } from "../../style/style";

// Definition $type -> stereotype (undefined = plain part/class box).
const DEF_KINDS: Record<string, string | null> = {
  PartDefinition: null,
  ItemDefinition: "item",
  ActionDefinition: "action",
  AttributeDefinition: "attribute",
  EnumerationDefinition: "enumeration",
  PortDefinition: "port",
  InterfaceDefinition: "interface",
  ConnectionDefinition: "connection",
};

// Usages that decompose a definition (whole-part) -> composition edge. ActionUsage
// makes the class diagram a Block Definition Diagram: it renders function breakdowns
// (action def decomposed into sub-actions) as well as component breakdowns.
const COMPOSITION_USAGES = new Set(["PartUsage", "ItemUsage", "PortUsage", "ActionUsage"]);
const ASSOCIATION_USAGES = new Set(["ReferenceUsage"]);

function childNodes(node: SysmlNode): SysmlNode[] {
  const out: SysmlNode[] = [];
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const value = (node as any)[key];
    if (Array.isArray(value)) {
      for (const el of value) if (el && typeof el === "object" && el.$type) out.push(el);
    } else if (value && typeof value === "object" && value.$type) {
      out.push(value);
    }
  }
  return out;
}

function qnOf(node: SysmlNode): string | undefined {
  try {
    return node?.$meta?.qualifiedName;
  } catch {
    return undefined;
  }
}
function nameOf(node: SysmlNode): string {
  return node?.declaredName ?? (() => { try { return node?.$meta?.name; } catch { return undefined; } })() ?? "(anonymous)";
}
function cstText(node: SysmlNode): string {
  return (node?.$cstNode?.text ?? "").replace(/\s+/g, " ").trim();
}
function shortName(qn: string): string {
  return qn.split("::").pop() as string;
}

/** Direct definitions owned by the package. */
function topLevelDefs(pkg: SysmlNode): SysmlNode[] {
  const out: SysmlNode[] = [];
  for (const member of childNodes(pkg)) {
    for (const el of [member, ...childNodes(member)]) {
      if (el.$type in DEF_KINDS) out.push(el);
    }
  }
  return out;
}

/** Feature usages directly owned by a definition. */
function ownedUsages(def: SysmlNode): SysmlNode[] {
  const out: SysmlNode[] = [];
  for (const child of childNodes(def)) {
    if (child.$type.endsWith("Membership")) {
      for (const g of childNodes(child)) if (g.$type.endsWith("Usage")) out.push(g);
    } else if (child.$type.endsWith("Usage")) {
      out.push(child);
    }
  }
  return out;
}

interface TypeInfo {
  qn?: string;
  name?: string;
  multiplicity?: string;
}
function typeInfo(usage: SysmlNode): TypeInfo {
  let qn: string | undefined;
  let name: string | undefined;
  try {
    const types = [...(usage.$meta?.types?.() ?? [])];
    if (types[0]) {
      qn = types[0].qualifiedName;
      name = types[0].name;
    }
  } catch {
    /* unresolved */
  }
  if (!name) {
    const m = cstText(usage).match(/:\s*([\w:.]+)/);
    if (m) name = m[1].split("::").pop();
  }
  const mm = cstText(usage).match(/\[([^\]]+)\]/);
  return { qn, name, multiplicity: mm ? mm[1] : undefined };
}

function supertypes(def: SysmlNode): Array<{ qn?: string; name?: string }> {
  try {
    return (def.$meta?.specializations?.() ?? [])
      .filter((s: any) => /Subclassification|Specialization/.test(s?.constructor?.name ?? ""))
      .map((s: any) => {
        const t = s.element ? s.element() : undefined;
        return { qn: t?.qualifiedName, name: t?.name };
      })
      .filter((t: any) => t.qn || t.name);
  } catch {
    return [];
  }
}

export function extractClass(pkg: SysmlNode, styleSheet?: StyleSheet): ClassModel {
  const defs = topLevelDefs(pkg);
  const classes: ClassNode[] = [];
  const byId = new Map<string, ClassNode>();
  const relations: ClassRelation[] = [];

  const idOf = (def: SysmlNode) => qnOf(def) ?? nameOf(def);

  const ensureExternal = (qn?: string, name?: string): string | undefined => {
    const id = qn ?? name;
    if (!id) return undefined;
    if (!byId.has(id)) {
      const node: ClassNode = { id, name: name ?? shortName(id), members: [], literals: [], external: true };
      classes.push(node);
      byId.set(id, node);
    }
    return id;
  };

  // 1) one box per definition
  for (const def of defs) {
    const id = idOf(def);
    const node: ClassNode = {
      id,
      name: nameOf(def),
      stereotype: DEF_KINDS[def.$type] ?? undefined,
      members: [],
      literals: [],
      isDefinition: true,
      style: matchStyle(styleSheet, styleInfo(def)),
      doc: docOf(def),
    };
    classes.push(node);
    byId.set(id, node);
  }

  // 2) members, literals, relations
  for (const def of defs) {
    const node = byId.get(idOf(def))!;

    for (const usage of ownedUsages(def)) {
      const name = nameOf(usage);
      const info = typeInfo(usage);

      if (usage.$type === "EnumerationUsage") {
        node.literals.push(name);
        continue;
      }

      const targetInDiagram = info.qn && byId.has(info.qn) ? info.qn : undefined;

      if (targetInDiagram && COMPOSITION_USAGES.has(usage.$type)) {
        relations.push({ source: node.id, target: targetInDiagram, kind: "composition", label: name, multiplicity: info.multiplicity });
      } else if (targetInDiagram && ASSOCIATION_USAGES.has(usage.$type)) {
        relations.push({ source: node.id, target: targetInDiagram, kind: "association", label: name, multiplicity: info.multiplicity });
      } else {
        // keep as a compartment field (attributes, or parts typed outside the package)
        const member: ClassMember = { name, type: info.name };
        node.members.push(member);
      }
    }

    // 3) inheritance
    for (const sup of supertypes(def)) {
      const targetId = sup.qn && byId.has(sup.qn) ? sup.qn : ensureExternal(sup.qn, sup.name);
      if (targetId) relations.push({ source: node.id, target: targetId, kind: "inheritance" });
    }
  }

  return { classes, relations };
}

/**
 * Optionally hide, from a class/requirement model:
 *  - `hideInheritance`: the inheritance edges and the (usually imported) supertypes
 *    they point to — i.e. the "inherited types". External boxes left orphaned are dropped.
 *  - `hideDefinitions`: the definition boxes themselves (kept usages/instances only).
 * Shared by the class and requirement diagrams (same IR).
 */
export function filterClassModel(
  model: ClassModel,
  opts: { hideDefinitions?: boolean; hideInheritance?: boolean }
): ClassModel {
  if (!opts.hideDefinitions && !opts.hideInheritance) return model;

  let classes = model.classes;
  let relations = model.relations;

  if (opts.hideInheritance) {
    relations = relations.filter((r) => r.kind !== "inheritance");
  }
  if (opts.hideDefinitions) {
    const removed = new Set(classes.filter((c) => c.isDefinition).map((c) => c.id));
    classes = classes.filter((c) => !removed.has(c.id));
    relations = relations.filter((r) => !removed.has(r.source) && !removed.has(r.target));
  }

  // Drop external (imported) boxes left unreferenced — e.g. supertypes orphaned by
  // hiding inheritance. Local boxes are kept even when isolated (they are content).
  const referenced = new Set<string>();
  for (const r of relations) {
    referenced.add(r.source);
    referenced.add(r.target);
  }
  classes = classes.filter((c) => !c.external || referenced.has(c.id));

  return { classes, relations };
}
