import type { SysmlNode } from "../sysml/parser";
import type { StyleSheet } from "../style/style";
import { flowchartDiagram } from "./flowchart";
import { classDiagram } from "./class";
import { stateDiagram } from "./state";
import { sequenceDiagram } from "./sequence";
import { requirementDiagram } from "./requirement";
import { interconnectionDiagram } from "./interconnection";
import { realizationDiagram } from "./realization";

export interface DiagramConfig {
  direction: "TB" | "LR" | "BT" | "RL";
  theme: string;
  /** Optional style sheet applied to elements by native type / SysML type. */
  styleSheet?: StyleSheet;
  /** Hide definition boxes (class / requirement views). Toggled per panel. */
  hideDefinitions?: boolean;
  /** Hide inheritance edges and their (imported) supertypes. Toggled per panel. */
  hideInheritance?: boolean;
}

export interface DiagramType {
  /** Stable id, e.g. "flowchart". */
  id: string;
  /** VS Code command id, e.g. "celeris.showFlowchart". */
  commandId: string;
  /** Human label used in menus and panel titles. */
  label: string;
  /**
   * Build Mermaid text for the given package, or return null if the package has
   * no elements relevant to this diagram type.
   */
  build(pkg: SysmlNode, config: DiagramConfig): string | null;
}

export const diagramTypes: DiagramType[] = [
  flowchartDiagram,
  classDiagram,
  stateDiagram,
  sequenceDiagram,
  requirementDiagram,
  interconnectionDiagram,
  realizationDiagram,
];
