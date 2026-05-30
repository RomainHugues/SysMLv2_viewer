import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractClass } from "./extract";

const sample = path.resolve(process.cwd(), "examples/vehicle.sysml");

describe("extractClass (integration)", () => {
  it("extracts definitions, members, stereotypes, inheritance and composition", async () => {
    const text = fs.readFileSync(sample, "utf8");
    const { document } = await parseText(sample, text);
    const pkg = allPackages(document).find((p: any) => p.declaredName === "VehicleModel");
    const model = extractClass(pkg);

    const names = model.classes.map((c) => c.name).sort();
    expect(names).toEqual(["Car", "Cylinder", "Engine", "FuelTank", "GearMode", "Truck", "Vehicle", "Wheel"]);

    const vehicle = model.classes.find((c) => c.name === "Vehicle")!;
    expect(vehicle.members.find((m) => m.name === "mass")?.type).toBe("Real");

    const tank = model.classes.find((c) => c.name === "FuelTank")!;
    expect(tank.stereotype).toBe("item");

    const gear = model.classes.find((c) => c.name === "GearMode")!;
    expect(gear.stereotype).toBe("enumeration");
    expect(gear.literals).toEqual(["park", "drive", "reverse"]);

    const kinds = (src: string, tgt: string) =>
      model.relations
        .filter((r) => byName(model, r.source) === src && byName(model, r.target) === tgt)
        .map((r) => r.kind);

    expect(kinds("Car", "Vehicle")).toContain("inheritance");
    expect(kinds("Truck", "Vehicle")).toContain("inheritance");
    expect(kinds("Vehicle", "Engine")).toContain("composition");
    const wheels = model.relations.find(
      (r) => byName(model, r.source) === "Vehicle" && byName(model, r.target) === "Wheel"
    );
    expect(wheels?.multiplicity).toBe("4");
  });
});

function byName(model: { classes: { id: string; name: string }[] }, id: string): string {
  return model.classes.find((c) => c.id === id)?.name ?? id;
}
