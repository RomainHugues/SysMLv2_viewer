// Shared AST helpers for diagram extractors (syside-languageserver AST is loosely
// typed at this boundary; see sysml/parser.ts).
import type { SysmlNode } from "../sysml/parser";

/** Direct AST child nodes (membership wrappers included), no cross-refs/back-refs. */
export function childNodes(node: SysmlNode): SysmlNode[] {
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

export function qnOf(node: SysmlNode): string | undefined {
  try {
    return node?.$meta?.qualifiedName;
  } catch {
    return undefined;
  }
}

export function nameOf(node: SysmlNode): string {
  return (
    node?.declaredName ??
    (() => {
      try {
        return node?.$meta?.name;
      } catch {
        return undefined;
      }
    })() ??
    "(anonymous)"
  );
}

export function cstText(node: SysmlNode): string {
  return (node?.$cstNode?.text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Style classification for an element: its native SysML type ($type, e.g.
 * "PartUsage") and the qualified names of every type it conforms to, following
 * the typing/specialization hierarchy (e.g. ["MyPkg::Radio", "Arcadia::LogicalComponent"]).
 * Short names are appended so style rules can match on simple names too.
 */
export interface ElementStyleInfo {
  nativeType: string;
  typeChain: string[];
}

export function styleInfo(node: SysmlNode): ElementStyleInfo {
  const chain = new Set<string>();
  const add = (qn?: string) => {
    if (!qn) return;
    chain.add(qn);
    const short = qn.split("::").pop();
    if (short) chain.add(short);
  };
  try {
    for (const t of node.$meta?.allTypes?.() ?? []) add(t.qualifiedName);
  } catch {
    /* ignore */
  }
  // definitions: include their own supertypes
  try {
    for (const s of node.$meta?.specializations?.() ?? []) {
      const el = s.element ? s.element() : undefined;
      add(el?.qualifiedName);
    }
  } catch {
    /* ignore */
  }
  return { nativeType: node.$type, typeChain: [...chain] };
}

/**
 * Descendants within a container's scope: recurses through membership wrappers
 * and transitions, but does not descend into nested containers of `stopTypes`
 * (so a nested behaviour/state is yielded as a leaf). Cycle-safe.
 */
export function* scopedDescendants(container: SysmlNode, stopTypes: Set<string>): Generator<SysmlNode> {
  const seen = new Set<SysmlNode>();
  function* walk(node: SysmlNode): Generator<SysmlNode> {
    for (const child of childNodes(node)) {
      if (seen.has(child)) continue;
      seen.add(child);
      yield child;
      if (!stopTypes.has(child.$type)) yield* walk(child);
    }
  }
  yield* walk(container);
}

/** Direct members owned by a namespace/definition, unwrapping one membership level. */
export function ownedElements(container: SysmlNode, typeTest: (t: string) => boolean): SysmlNode[] {
  const out: SysmlNode[] = [];
  for (const child of childNodes(container)) {
    if (typeTest(child.$type)) out.push(child);
    else if (child.$type.endsWith("Membership")) {
      for (const g of childNodes(child)) if (typeTest(g.$type)) out.push(g);
    }
  }
  return out;
}

/** Source/target names of a SuccessionAsUsage (empty source => initial transition). */
export function successionEndpoints(succ: SysmlNode): { source?: string; target?: string } {
  let names: string[] = [];
  try {
    names = (succ.$meta?.relatedFeatures?.() ?? []).map((f: any) => (f ? f.name ?? "" : ""));
  } catch {
    /* fall back to text */
  }
  let source: string | undefined;
  let target: string | undefined;
  if (names.length >= 2) {
    source = names[0];
    target = names[names.length - 1];
  } else if (names.length === 1) {
    target = names[0];
  }
  if (!target) {
    const m = cstText(succ).match(/then\s+([A-Za-z_]\w*)/);
    if (m) target = m[1];
  }
  if (!source) {
    const m = cstText(succ).match(/first\s+([A-Za-z_]\w*)/);
    if (m) source = m[1];
  }
  return { source: source || undefined, target: target || undefined };
}

/** Trigger/guard/effect label of the TransitionUsage enclosing a succession (if any). */
export function transitionLabel(succ: SysmlNode): string | undefined {
  let c = succ.$container;
  while (c) {
    if (c.$type === "TransitionUsage") {
      const trigger = c.accepter ? cstText(c.accepter).replace(/^accept\s+/i, "") : "";
      const guard = c.guard ? cstText(c.guard).replace(/^if\s+/i, "") : "";
      const effect = c.effect ? cstText(c.effect).replace(/^do\s+/i, "") : "";
      const parts = [trigger, guard ? `[${guard}]` : "", effect ? `/ ${effect}` : ""].filter(Boolean);
      return parts.length ? parts.join(" ") : undefined;
    }
    c = c.$container;
  }
  return undefined;
}
