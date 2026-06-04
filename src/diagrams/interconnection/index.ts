import type { DiagramType } from "../registry";
import { extractInterconnection } from "./extract";
import { ibdToMermaid } from "./mermaid";

export const interconnectionDiagram: DiagramType = {
  id: "interconnection",
  commandId: "celeris.showInterconnection",
  label: "Interconnection",
  build(pkg, config) {
    const model = extractInterconnection(pkg);
    if (model.groups.length === 0) return null;
    return ibdToMermaid(model, { direction: config.direction });
  },
};
