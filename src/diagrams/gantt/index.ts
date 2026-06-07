import type { DiagramType } from "../registry";
import { extractGantt } from "./extract";
import { ganttToMermaid } from "./mermaid";

export const ganttDiagram: DiagramType = {
  id: "gantt",
  commandId: "celeris.showGantt",
  label: "Gantt",
  build(pkg) {
    const model = extractGantt(pkg);
    if (model.tasks.length === 0) return null;
    return ganttToMermaid(model);
  },
};
