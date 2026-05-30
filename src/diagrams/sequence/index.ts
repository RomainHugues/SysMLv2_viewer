import type { DiagramType } from "../registry";
import { extractSequence } from "./extract";
import { sequenceToMermaid } from "./mermaid";

export const sequenceDiagram: DiagramType = {
  id: "sequence",
  commandId: "sysmlMermaid.showSequence",
  label: "Sequence",
  build(pkg, config) {
    const model = extractSequence(pkg, config.styleSheet);
    if (model.messages.length === 0) return null;
    return sequenceToMermaid(model);
  },
};
