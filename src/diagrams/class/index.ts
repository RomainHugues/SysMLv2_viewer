import type { DiagramType } from "../registry";
import { extractClass } from "./extract";
import { classToMermaid } from "./mermaid";

export const classDiagram: DiagramType = {
  id: "class",
  commandId: "sysmlMermaid.showClass",
  label: "Class",
  build(pkg) {
    const model = extractClass(pkg);
    if (model.classes.length === 0) return null;
    return classToMermaid(model);
  },
};
