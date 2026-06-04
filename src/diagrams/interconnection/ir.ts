// Intermediate representation for the interconnection (Internal Block Diagram) view:
// blocks (parts / actions) bearing ports / in-out parameters, wired together by
// connections, interfaces and item flows. Independent of the AST and of Mermaid.

export type BlockKind = "part" | "action";
export type PortDirection = "in" | "out" | "inout";

export interface IbdPort {
  /** Group-unique id, e.g. "sensor.pwr". */
  id: string;
  name: string;
  /** in / out (action parameters, directed ports); undefined = plain bidirectional port. */
  direction?: PortDirection;
  /** Port-def / item type short name, if any. */
  type?: string;
}

export interface IbdBlock {
  /** Group-unique id = the usage name (e.g. "sensor"). */
  id: string;
  name: string;
  kind: BlockKind;
  /** The definition it is typed by (short name), if any. */
  type?: string;
  ports: IbdPort[];
}

export type ConnectorKind = "connect" | "interface" | "flow";

export interface IbdEnd {
  block: string; // block id
  port?: string; // port id (undefined = connect at block level)
}

export interface IbdConnector {
  source: IbdEnd;
  target: IbdEnd;
  kind: ConnectorKind;
  /** Interface name/type, or the flowed item. */
  label?: string;
}

/** One containing definition (a part def or action def) and its internal wiring. */
export interface IbdGroup {
  id: string;
  label: string;
  /** Dominant block kind in this context (parts -> structure, actions -> behaviour). */
  kind: BlockKind;
  blocks: IbdBlock[];
  connectors: IbdConnector[];
}

export interface IbdModel {
  groups: IbdGroup[];
}
