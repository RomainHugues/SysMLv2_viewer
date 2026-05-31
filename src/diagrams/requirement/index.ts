import type { DiagramType } from "../registry";
import { extractRequirements } from "./extract";
import { classToMermaid } from "../class/mermaid";

export const requirementDiagram: DiagramType = {
  id: "requirement",
  commandId: "sysmlMermaid.showRequirement",
  label: "Requirement",
  build(pkg, config) {
    const model = extractRequirements(pkg, config.styleSheet);
    if (model.classes.length === 0) return null;
    return classToMermaid(model);
  },
};
