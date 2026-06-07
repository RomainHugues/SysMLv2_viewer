import type { DiagramType } from "../registry";
import { extractRealization } from "./extract";
import { realizationToMermaid } from "./mermaid";

export const realizationDiagram: DiagramType = {
  id: "realization",
  commandId: "celeris.showRealization",
  label: "Realization",
  build(pkg, config) {
    const model = extractRealization(pkg, config.styleSheet);
    if (model.levels.length === 0 || model.edges.length === 0) return null;
    return realizationToMermaid(model);
  },
};
