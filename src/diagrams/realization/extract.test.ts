import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractRealization } from "./extract";

const sample = path.resolve(process.cwd(), "examples/realization/cross_level.sysml");

describe("extractRealization", () => {
  it("places elements in ordered engineering lanes and links them by dependency", async () => {
    const { document } = await parseText(sample, fs.readFileSync(sample, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "CrossLevelRealization");
    const model = extractRealization(pkg);

    // lanes present, in engineering order (most abstract first)
    expect(model.levels.map((l) => l.key)).toEqual(["operational", "system", "logical", "physical"]);

    const all = model.levels.flatMap((l) => l.nodes);
    const node = (name: string) => all.find((n) => n.name === name)!;

    // an element's lane comes from its conformed profile type
    expect(node("FlightController").level).toBe("logical");
    expect(node("FlightController").type).toBe("LogicalComponent");
    expect(node("DetectIntrusion").level).toBe("system");
    expect(node("OnboardComputer").level).toBe("physical");

    // realization edge: a system function realizes an operational activity
    const e = model.edges.find(
      (x) => x.source === node("DetectIntrusion").id && x.target === node("ConductSurveillance").id
    );
    expect(e).toBeTruthy();

    // a named dependency keeps its name as the edge label
    const traced = model.edges.find((x) => x.target === node("Operator").id)!;
    expect(traced.label).toBe("trace");

    // marker types that are not endpoints of any dependency are not shown
    expect(all.find((n) => n.name === "LogicalComponent")).toBeUndefined();
  });
});
