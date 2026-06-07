// Intermediate representation for the realization view: elements grouped into
// ordered engineering-level lanes, with realization/traceability edges (from
// SysML dependencies) running between them. Independent of the AST and Mermaid.

import type { StyleProps } from "../../style/style";

export interface RealNode {
  /** Stable id (qualified name when available). */
  id: string;
  name: string;
  /** Level key this node belongs to (see LEVELS in extract.ts), or "other". */
  level: string;
  /** Conformed profile type short name (e.g. LogicalComponent), if any. */
  type?: string;
  style?: StyleProps;
}

export interface RealEdge {
  source: string; // node id (the realizing / client element)
  target: string; // node id (the realized / supplier element)
  label?: string; // dependency name: realize / trace / refine / derive ...
}

/** One engineering-level lane. */
export interface RealLevel {
  key: string;
  label: string;
  nodes: RealNode[];
}

export interface RealModel {
  /** Non-empty lanes, in engineering order (most abstract first). */
  levels: RealLevel[];
  edges: RealEdge[];
}
