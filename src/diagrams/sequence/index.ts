import type { DiagramType } from "../registry";
import { extractSequence } from "./extract";
import { sequenceToMermaid } from "./mermaid";

export const sequenceDiagram: DiagramType = {
  id: "sequence",
  commandId: "sysmlMermaid.showSequence",
  label: "Sequence",
  build(pkg) {
    const model = extractSequence(pkg);
    if (model.messages.length === 0) return null;
    return sequenceToMermaid(model);
  },
};
