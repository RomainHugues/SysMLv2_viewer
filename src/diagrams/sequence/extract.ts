import type { SysmlNode } from "../../sysml/parser";
import type { SequenceModel, SeqParticipant, SeqMessage } from "./ir";
import { childNodes, nameOf, cstText, scopedDescendants, ownedElements, styleInfo } from "../ast";
import { matchStyle, type StyleSheet } from "../../style/style";

function offsetOf(node: SysmlNode): number {
  return node?.$cstNode?.offset ?? 0;
}

/** First identifier of an end reference, e.g. "customer.out" -> "customer". */
function firstId(text: string): string {
  const m = text.match(/[A-Za-z_]\w*/);
  return m ? m[0] : text;
}

/** Optional item type carried by a flow (`flow of T ...`). */
function flowItemType(flow: SysmlNode): string | undefined {
  for (const child of childNodes(flow)) {
    if (child.$type === "FeatureTyping" || child.$type === "ReferenceSubsetting") {
      const t = cstText(child).split("::").pop();
      if (t) return t;
    }
  }
  return undefined;
}

export function extractSequence(pkg: SysmlNode, styleSheet?: StyleSheet): SequenceModel {
  const participants: SeqParticipant[] = [];
  const byName = new Map<string, SeqParticipant>();
  const add = (name: string, node?: SysmlNode): string => {
    let p = byName.get(name);
    if (!p) {
      p = { id: name, name };
      participants.push(p);
      byName.set(name, p);
    }
    if (node && !p.style) p.style = matchStyle(styleSheet, styleInfo(node));
    return name;
  };

  // Participants = part usages declared in the package, in document order.
  const parts = ownedElements(pkg, (t) => t === "PartUsage").sort((a, b) => offsetOf(a) - offsetOf(b));
  for (const p of parts) add(nameOf(p), p);

  // Messages = flow connections, in document order.
  const flows = [...scopedDescendants(pkg, new Set())]
    .filter((n) => n.$type === "FlowConnectionUsage")
    .sort((a, b) => offsetOf(a) - offsetOf(b));

  const messages: SeqMessage[] = [];
  for (const flow of flows) {
    const ends: SysmlNode[] = Array.isArray((flow as any).ends) ? (flow as any).ends : [];
    if (ends.length < 2) continue;
    const from = firstId(cstText(ends[0]));
    const to = firstId(cstText(ends[1]));
    if (!from || !to) continue;
    add(from);
    add(to);
    const label = (flow.declaredName as string) || flowItemType(flow) || "";
    messages.push({ from, to, label });
  }

  return { participants, messages };
}
