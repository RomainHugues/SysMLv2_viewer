import type { DiagramType } from "../registry";
import { extractRequirements } from "./extract";
import { filterClassModel } from "../class/extract";
import { classToMermaid } from "../class/mermaid";

export const requirementDiagram: DiagramType = {
  id: "requirement",
  commandId: "celeris.showRequirement",
  label: "Requirement",
  build(pkg, config) {
    const model = filterClassModel(extractRequirements(pkg, config.styleSheet), config);
    if (model.classes.length === 0) return null;
    return classToMermaid(model);
  },
};
