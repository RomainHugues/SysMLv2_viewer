import type { SysmlNode } from "../../sysml/parser";
import type { FlowModel, FlowGroup, FlowNode, FlowEdge, FlowNodeKind } from "../ir";
import { styleInfo } from "../ast";
import { matchStyle, type StyleSheet } from "../../style/style";

// SysML element $type -> flow node kind. Elements not listed are "noise" and are
// excluded from flowcharts (attributes, parts, doc, references, ...).
const NODE_KINDS: Record<string, FlowNodeKind> = {
  ActionUsage: "action",
  PerformActionUsage: "action",
  DecisionNode: "decision",
  MergeNode: "merge",
  ForkNode: "fork",
  JoinNode: "join",
  AcceptActionUsage: "accept",
  SendActionUsage: "send",
};

// Behaviours that become a subgraph. We treat their inner action usages as leaf
// nodes (we do not recurse into nested behaviours for now).
const CONTAINER_KINDS = new Set(["ActionDefinition", "ActionUsage", "PerformActionUsage"]);

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

/** Direct AST child nodes (membership wrappers included), no cross-refs/back-refs. */
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

/**
 * Descendants within a single behaviour's scope: recurses through membership
 * wrappers and transitions, but does not descend into nested behaviours (so a
 * sub-action is yielded as a leaf, not flattened). Cycle-safe.
 */
function* scopedDescendants(container: SysmlNode): Generator<SysmlNode> {
  const seen = new Set<SysmlNode>();
  function* walk(node: SysmlNode): Generator<SysmlNode> {
    for (const child of childNodes(node)) {
      if (seen.has(child)) continue;
      seen.add(child);
      yield child;
      if (!CONTAINER_KINDS.has(child.$type)) {
        yield* walk(child);
      }
    }
  }
  yield* walk(container);
}

/** Top-level behaviours directly owned by the package. */
function topLevelBehaviours(pkg: SysmlNode): SysmlNode[] {
  const out: SysmlNode[] = [];
  for (const member of childNodes(pkg)) {
    // members are wrapped in a *Membership; unwrap one level.
    for (const el of [member, ...childNodes(member)]) {
      if (CONTAINER_KINDS.has(el.$type)) out.push(el);
    }
  }
  return out;
}

function stripGuardKeyword(text: string): string {
  return text.replace(/^if\s+/i, "").trim();
}

function enclosingTransitionGuard(succession: SysmlNode): string | undefined {
  let c = succession.$container;
  while (c) {
    if (c.$type === "TransitionUsage") {
      const guard = (c as any).guard;
      const text = guard ? stripGuardKeyword(cstText(guard)) : "";
      return text || undefined;
    }
    c = c.$container;
  }
  return undefined;
}

/** [sourceName, targetName] from a succession's CST text, as a fallback. */
function endpointsFromText(succession: SysmlNode): [string?, string?] {
  const text = cstText(succession);
  let m = text.match(/first\s+(\S+)\s+then\s+(\S+)/i);
  if (m) return [m[1], m[2].replace(/[;{].*$/, "")];
  m = text.match(/then\s+(\S+)/i);
  if (m) return [undefined, m[1].replace(/[;{].*$/, "")];
  return [undefined, undefined];
}

export function extractFlow(pkg: SysmlNode, styleSheet?: StyleSheet): FlowModel {
  const groups: FlowGroup[] = [];

  for (const behaviour of topLevelBehaviours(pkg)) {
    const nodes: FlowNode[] = [];
    const byId = new Map<string, FlowNode>();
    const byName = new Map<string, FlowNode>();

    const addNode = (id: string, label: string, kind: FlowNodeKind, el?: SysmlNode): FlowNode => {
      let node = byId.get(id);
      if (!node) {
        node = { id, label, kind };
        if (el) node.style = matchStyle(styleSheet, styleInfo(el));
        nodes.push(node);
        byId.set(id, node);
        byName.set(label, node);
      }
      return node;
    };

    // 1) collect leaf flow nodes
    for (const el of scopedDescendants(behaviour)) {
      const kind = NODE_KINDS[el.$type];
      if (!kind) continue;
      const name = nameOf(el);
      addNode(qnOf(el) ?? name, name, kind, el);
    }

    // 2) collect edges from successions (plain + guarded transitions)
    const edges: FlowEdge[] = [];
    for (const el of scopedDescendants(behaviour)) {
      if (el.$type !== "SuccessionAsUsage") continue;

      let srcId: string | undefined;
      let tgtId: string | undefined;
      try {
        const related = el.$meta?.relatedFeatures?.() ?? [];
        if (related[0]) srcId = related[0].qualifiedName ?? related[0].name;
        const last = related[related.length - 1];
        if (related.length >= 2 && last) tgtId = last.qualifiedName ?? last.name;
      } catch {
        /* fall through to text */
      }

      const [srcText, tgtText] = endpointsFromText(el);
      const resolve = (id: string | undefined, fallback: string | undefined): string | undefined => {
        if (id && (byId.has(id) || byName.has(id))) return (byId.get(id) ?? byName.get(id))!.id;
        const name = fallback ?? id;
        if (!name) return undefined;
        if (byName.has(name)) return byName.get(name)!.id;
        // synthesize a node for unresolved endpoints (e.g. start/done, externals)
        const kind: FlowNodeKind = /^start$/i.test(name) ? "start" : /^(done|end)$/i.test(name) ? "end" : "action";
        return addNode(name, name, kind).id;
      };

      const source = resolve(srcId, srcText);
      const target = resolve(tgtId, tgtText);
      if (source && target) {
        edges.push({ source, target, label: enclosingTransitionGuard(el) });
      }
    }

    if (nodes.length > 0) {
      groups.push({ id: qnOf(behaviour) ?? nameOf(behaviour), label: nameOf(behaviour), nodes, edges });
    }
  }

  return { groups };
}
