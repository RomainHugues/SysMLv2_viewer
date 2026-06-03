import type { DiagramType } from "../registry";
import { extractClass, filterClassModel } from "./extract";
import { classToMermaid } from "./mermaid";

export const classDiagram: DiagramType = {
  id: "class",
  commandId: "celeris.showClass",
  label: "Class",
  build(pkg, config) {
    const model = filterClassModel(extractClass(pkg, config.styleSheet), config);
    if (model.classes.length === 0) return null;
    return classToMermaid(model);
  },
};
