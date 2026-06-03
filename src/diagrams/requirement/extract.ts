import type { SysmlNode } from "../../sysml/parser";
import type { ClassModel, ClassNode, ClassRelation } from "../class/ir";
import { childNodes, qnOf, nameOf, cstText, ownedElements, scopedDescendants, styleInfo, docOf } from "../ast";
import { matchStyle, type StyleSheet } from "../../style/style";

/** First identifier in a reference's text, e.g. "VehicleRequirements::A" -> "A". */
function firstId(text: string): string {
  const segs = text.trim().split(/\s+/)[0]?.split("::") ?? [];
  return segs[segs.length - 1] ?? text.trim();
}

const REQ_DEF = "RequirementDefinition";
const REQ_USAGE = "RequirementUsage";
const PART_KINDS = new Set(["PartDefinition", "PartUsage", "ItemDefinition", "ItemUsage"]);

/** Resolved type qualified name of a usage (typing/specialization), if any. */
function typeQnOf(node: SysmlNode): string | undefined {
  try {
    const t = [...(node.$meta?.types?.() ?? [])][0];
    return t?.qualifiedName;
  } catch {
    return undefined;
  }
}

/** Subject type shown in a requirement box, e.g. "subject : Vehicle". */
function subjectType(reqDef: SysmlNode): string | undefined {
  for (const child of childNodes(reqDef)) {
    if (child.$type === "SubjectMembership") {
      const m = cstText(child).match(/:\s*([\w:.]+)/);
      if (m) return m[1].split("::").pop();
    }
  }
  return undefined;
}

/** Enclosing part/item that owns a satisfy usage (the satisfier). */
function enclosingSatisfier(node: SysmlNode): SysmlNode | undefined {
  let c = node.$container;
  while (c) {
    if (PART_KINDS.has(c.$type)) return c;
    c = c.$container;
  }
  return undefined;
}

export function extractRequirements(pkg: SysmlNode, styleSheet?: StyleSheet): ClassModel {
  const reqDefs = ownedElements(pkg, (t) => t === REQ_DEF);
  const classes: ClassNode[] = [];
  const byId = new Map<string, ClassNode>();
  const byName = new Map<string, ClassNode>();
  const relations: ClassRelation[] = [];

  const addNode = (id: string, name: string, stereotype: string | undefined, node?: SysmlNode): ClassNode => {
    let c = byId.get(id);
    if (!c) {
      c = { id, name, stereotype, members: [], literals: [], isDefinition: node?.$type?.endsWith("Definition") };
      if (node) c.style = matchStyle(styleSheet, styleInfo(node));
      classes.push(c);
      byId.set(id, c);
      byName.set(name, c);
    }
    return c;
  };

  // 1) one «requirement» box per requirement definition
  for (const def of reqDefs) {
    const node = addNode(qnOf(def) ?? nameOf(def), nameOf(def), "requirement", def);
    node.doc = docOf(def);
    const subj = subjectType(def);
    if (subj) node.members.push({ name: "subject", type: subj });
  }

  // 2) derivation (specialization) + containment (nested requirement usages)
  for (const def of reqDefs) {
    const id = qnOf(def) ?? nameOf(def);

    // derive / refine: requirement specializes requirement
    try {
      for (const s of def.$meta?.specializations?.() ?? []) {
        const target = s.element ? s.element() : undefined;
        const tqn = target?.qualifiedName;
        if (tqn && byId.has(tqn)) relations.push({ source: id, target: tqn, kind: "inheritance", label: "derive" });
      }
    } catch {
      /* ignore */
    }

    // containment: a nested `requirement x : SubReq` decomposes def into SubReq
    for (const u of scopedDescendants(def, new Set([REQ_DEF]))) {
      if (u.$type !== REQ_USAGE) continue;
      const tqn = typeQnOf(u);
      if (tqn && byId.has(tqn)) {
        relations.push({ source: id, target: tqn, kind: "composition", label: nameOf(u) });
      }
    }
  }

  // 3) satisfy: a part/item that satisfies a requirement
  for (const sat of scopedDescendants(pkg, new Set())) {
    if (sat.$type !== "SatisfyRequirementUsage") continue;
    const m = cstText(sat).match(/satisfy\s+(?:requirement\s+)?([A-Za-z_]\w*)/i);
    const reqName = m?.[1];
    const reqNode = reqName ? byName.get(reqName) : undefined;
    if (!reqNode) continue;
    const satisfier = enclosingSatisfier(sat);
    const satName = satisfier ? nameOf(satisfier) : "(context)";
    const satId = satisfier ? (qnOf(satisfier) ?? satName) : "satisfier:" + satName;
    addNode(satId, satName, "part", satisfier);
    relations.push({ source: satId, target: reqNode.id, kind: "dependency", label: "satisfy" });
  }

  // 4) trace / derive / refine expressed as a `dependency from A to B`
  for (const dep of scopedDescendants(pkg, new Set())) {
    if (dep.$type !== "Dependency") continue;
    const clients: string[] = ((dep as any).client ?? []).map((c: SysmlNode) => firstId(cstText(c)));
    const suppliers: string[] = ((dep as any).supplier ?? []).map((c: SysmlNode) => firstId(cstText(c)));
    const label = (dep.declaredName as string) || "trace";
    for (const cl of clients) {
      for (const su of suppliers) {
        const from = byName.get(cl);
        const to = byName.get(su);
        if (from && to) relations.push({ source: from.id, target: to.id, kind: "dependency", label });
      }
    }
  }

  return { classes, relations };
}
