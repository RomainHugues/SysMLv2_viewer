// Intermediate representation for state diagrams.

export interface StateNode {
  id: string;
  name: string;
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
