import type { SysmlNode } from "../sysml/parser";
import { flowchartDiagram } from "./flowchart";
import { classDiagram } from "./class";
import { stateDiagram } from "./state";
import { sequenceDiagram } from "./sequence";

export interface DiagramConfig {
  direction: "TB" | "LR" | "BT" | "RL";
  theme: string;
}

export interface DiagramType {
  /** Stable id, e.g. "flowchart". */
  id: string;
  /** VS Code command id, e.g. "sysmlMermaid.showFlowchart". */
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
];
