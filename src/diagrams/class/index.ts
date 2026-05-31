import type { DiagramType } from "../registry";
import { extractClass } from "./extract";
import { classToMermaid } from "./mermaid";

export const classDiagram: DiagramType = {
  id: "class",
  commandId: "celeris.showClass",
  label: "Class",
  build(pkg, config) {
    const model = extractClass(pkg, config.styleSheet);
    if (model.classes.length === 0) return null;
    return classToMermaid(model);
  },
};
