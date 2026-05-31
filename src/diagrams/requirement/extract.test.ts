import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractRequirements } from "./extract";

const sample = path.resolve(process.cwd(), "examples/vehicle_requirements.sysml");

describe("extractRequirements (integration)", () => {
  it("extracts requirements, subject, derivation, decomposition and satisfy", async () => {
    const { document } = await parseText(sample, fs.readFileSync(sample, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "VehicleRequirements");
    const m = extractRequirements(pkg);
    const name = (id: string) => m.classes.find((c) => c.id === id)?.name ?? id;

    // requirement boxes carry the «requirement» stereotype
    const reqs = m.classes.filter((c) => c.stereotype === "requirement").map((c) => c.name).sort();
    expect(reqs).toEqual(["BrakingDistance", "MassLimit", "RegulatoryReq", "SafetyRequirement", "VehicleSpecification"]);

    // subject shown on VehicleSpecification + documentation in the box
    const spec = m.classes.find((c) => c.name === "VehicleSpecification")!;
    expect(spec.members.find((mm) => mm.name === "subject")?.type).toBe("Vehicle");
    expect(m.classes.find((c) => c.name === "MassLimit")!.doc).toMatch(/mass shall not exceed/i);

    const rel = (src: string, tgt: string) =>
      m.relations.find((r) => name(r.source) === src && name(r.target) === tgt);

    // derivation (specialization), labelled "derive"
    expect(rel("BrakingDistance", "SafetyRequirement")?.kind).toBe("inheritance");
    expect(rel("BrakingDistance", "SafetyRequirement")?.label).toBe("derive");
    // decomposition (nested requirement usages)
    expect(rel("VehicleSpecification", "MassLimit")?.kind).toBe("composition");
    expect(rel("VehicleSpecification", "MassLimit")?.label).toBe("massReq");
    // satisfy
    const sat = rel("brakes", "BrakingDistance");
    expect(sat?.kind).toBe("dependency");
    expect(sat?.label).toBe("satisfy");
    // trace (dependency from .. to ..)
    const tr = rel("MassLimit", "RegulatoryReq");
    expect(tr?.kind).toBe("dependency");
    expect(tr?.label).toBe("trace");
  });
});
