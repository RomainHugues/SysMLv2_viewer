import type { SysmlNode } from "../../sysml/parser";
import type { StateModel, StateMachine, StateNode, StateTransition } from "./ir";
import {
  qnOf,
  nameOf,
  ownedElements,
  scopedDescendants,
  successionEndpoints,
  transitionLabel,
  styleInfo,
} from "../ast";
import { matchStyle, type StyleSheet } from "../../style/style";

const STATE_CONTAINERS = new Set(["StateDefinition", "StateUsage"]);
const isStateContainer = (t: string) => STATE_CONTAINERS.has(t);

/** Top-level state machines (state def / state usage) owned by the package. */
function topLevelMachines(pkg: SysmlNode): SysmlNode[] {
  return ownedElements(pkg, isStateContainer);
}

export function extractState(pkg: SysmlNode, styleSheet?: StyleSheet): StateModel {
  const machines: StateMachine[] = [];

  for (const container of topLevelMachines(pkg)) {
    const states: StateNode[] = [];
    const byName = new Map<string, StateNode>();
    const addState = (name: string, node?: SysmlNode) => {
      let s = byName.get(name);
      if (!s) {
        s = { id: name, name };
        states.push(s);
        byName.set(name, s);
      }
      if (node && !s.style) s.style = matchStyle(styleSheet, styleInfo(node));
      return s;
    };

    // nested state usages are the states (don't descend into them)
    for (const st of scopedDescendants(container, STATE_CONTAINERS)) {
      if (isStateContainer(st.$type)) addState(nameOf(st), st);
    }

    const transitions: StateTransition[] = [];
    for (const succ of scopedDescendants(container, STATE_CONTAINERS)) {
      if (succ.$type !== "SuccessionAsUsage") continue;
      const { source, target } = successionEndpoints(succ);
      if (source) addState(source);
      if (target) addState(target);
      transitions.push({ source, target, label: transitionLabel(succ) });
    }

    if (states.length > 0 || transitions.length > 0) {
      machines.push({ id: qnOf(container) ?? nameOf(container), name: nameOf(container), states, transitions });
    }
  }

  return { machines };
}
