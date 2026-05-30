import type { SysmlNode } from "../../sysml/parser";
import type { StateModel, StateMachine, StateNode, StateTransition } from "./ir";
import {
  childNodes,
  qnOf,
  nameOf,
  ownedElements,
  scopedDescendants,
  successionEndpoints,
  transitionLabel,
} from "../ast";

const STATE_CONTAINERS = new Set(["StateDefinition", "StateUsage"]);
const isStateContainer = (t: string) => STATE_CONTAINERS.has(t);

/** Top-level state machines (state def / state usage) owned by the package. */
function topLevelMachines(pkg: SysmlNode): SysmlNode[] {
  return ownedElements(pkg, isStateContainer);
}

export function extractState(pkg: SysmlNode): StateModel {
  const machines: StateMachine[] = [];

  for (const container of topLevelMachines(pkg)) {
    const states: StateNode[] = [];
    const byName = new Map<string, StateNode>();
    const addState = (name: string) => {
      if (!byName.has(name)) {
        const s = { id: name, name };
        states.push(s);
        byName.set(name, s);
      }
    };

    // nested state usages are the states (don't descend into them)
    for (const st of scopedDescendants(container, STATE_CONTAINERS)) {
      if (isStateContainer(st.$type)) addState(nameOf(st));
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
