import type { DiagramType } from "../registry";
import { extractFlow } from "./extract";
import { flowToMermaid } from "./mermaid";

export const flowchartDiagram: DiagramType = {
  id: "flowchart",
  commandId: "sysmlMermaid.showFlowchart",
  label: "Flowchart",
  build(pkg, config) {
    const model = extractFlow(pkg);
    if (model.groups.length === 0) return null;
    return flowToMermaid(model, { direction: config.direction });
  },
};
