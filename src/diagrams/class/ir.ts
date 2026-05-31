// Intermediate representation for class diagrams.

export interface ClassMember {
  name: string;
  type?: string;
}

import type { StyleProps } from "../../style/style";

export interface ClassNode {
  id: string; // SysML qualified name (or short name for externals)
  name: string;
  stereotype?: string; // item, enumeration, port, ...
  members: ClassMember[];
  literals: string[]; // enumeration values
  external?: boolean; // referenced but defined outside the package
  style?: StyleProps;
  doc?: string; // documentation text shown inside the box
}

export type RelationKind = "inheritance" | "composition" | "association" | "dependency";

export interface ClassRelation {
  source: string; // owner / subclass id
  target: string; // type / superclass id
  kind: RelationKind;
  label?: string;
  multiplicity?: string;
}

export interface ClassModel {
  classes: ClassNode[];
  relations: ClassRelation[];
}
