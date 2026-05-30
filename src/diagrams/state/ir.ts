// Intermediate representation for state diagrams.

import type { StyleProps } from "../../style/style";

export interface StateNode {
  id: string;
  name: string;
  style?: StyleProps;
}

export interface StateTransition {
  source?: string; // undefined => from initial pseudostate [*]
  target?: string; // undefined => to final pseudostate [*]
  label?: string; // trigger [guard] / effect
}

export interface StateMachine {
  id: string;
  name: string;
  states: StateNode[];
  transitions: StateTransition[];
}

export interface StateModel {
  machines: StateMachine[];
}
