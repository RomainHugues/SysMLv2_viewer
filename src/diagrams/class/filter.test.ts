import { describe, it, expect } from "vitest";
import { filterClassModel } from "./extract";
import type { ClassModel } from "./ir";

const model: ClassModel = {
  classes: [
    { id: "P::Car", name: "Car", members: [], literals: [], isDefinition: true },
    { id: "P::Engine", name: "Engine", members: [], literals: [], isDefinition: true },
    { id: "Vehicle", name: "Vehicle", members: [], literals: [], external: true }, // imported supertype
    { id: "Fuel", name: "Fuel", members: [], literals: [], external: true }, // imported, used by composition
  ],
  relations: [
    { source: "P::Car", target: "Vehicle", kind: "inheritance" },
    { source: "P::Car", target: "P::Engine", kind: "composition", label: "engine" },
    { source: "P::Engine", target: "Fuel", kind: "composition", label: "fuel" },
  ],
};

const ids = (m: ClassModel) => m.classes.map((c) => c.id).sort();

describe("filterClassModel", () => {
  it("returns the model unchanged when no filter is set", () => {
    expect(filterClassModel(model, {})).toBe(model);
  });

  it("hideInheritance drops inheritance edges and orphaned imported supertypes", () => {
    const out = filterClassModel(model, { hideInheritance: true });
    expect(out.relations.some((r) => r.kind === "inheritance")).toBe(false);
    // Vehicle (only an inheritance target) is gone; Fuel (a composition target) stays
    expect(ids(out)).toEqual(["Fuel", "P::Car", "P::Engine"]);
  });

  it("keeps an imported type still referenced by a non-inheritance relation", () => {
    const out = filterClassModel(model, { hideInheritance: true });
    expect(out.classes.find((c) => c.id === "Fuel")).toBeTruthy();
  });

  it("hideDefinitions drops definition boxes and the relations touching them", () => {
    const out = filterClassModel(model, { hideDefinitions: true });
    expect(out.classes.every((c) => !c.isDefinition)).toBe(true);
    // every relation here touches a definition -> all removed; externals then orphaned -> removed
    expect(out.relations).toEqual([]);
    expect(out.classes).toEqual([]);
  });

  it("does not mutate the input model", () => {
    const before = JSON.stringify(model);
    filterClassModel(model, { hideDefinitions: true, hideInheritance: true });
    expect(JSON.stringify(model)).toBe(before);
  });
});
