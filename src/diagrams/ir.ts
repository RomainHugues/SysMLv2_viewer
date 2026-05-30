// Intermediate representation for flow-like diagrams (flowchart). Kept independent
// of both the SysML AST and Mermaid so extractors and renderers can be tested in
// isolation.

export type FlowNodeKind =
  | "action"
  | "decision"
  | "merge"
  | "fork"
  | "join"
  | "accept"
  | "send"
  | "start"
  | "end";

export interface FlowNode {
  /** Stable logical id (SysML qualified name when available, else the ref name). */
  id: string;
  label: string;
  kind: FlowNodeKind;
}

export interface FlowEdge {
  source: string;
  target: string;
  /** Guard / trigger label, e.g. "waterOk". */
  label?: string;
}

/** One behaviour (action def / action usage) rendered as a subgraph. */
export interface FlowGroup {
  id: string;
  label: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowModel {
  groups: FlowGroup[];
}
