import type { DiagramType } from "../registry";
import { extractState } from "./extract";
import { stateToMermaid } from "./mermaid";

export const stateDiagram: DiagramType = {
  id: "state",
  commandId: "sysmlMermaid.showState",
  label: "State",
  build(pkg, config) {
    const model = extractState(pkg, config.styleSheet);
    if (model.machines.length === 0) return null;
    return stateToMermaid(model, { direction: config.direction });
  },
};
