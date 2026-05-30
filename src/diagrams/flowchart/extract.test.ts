import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractFlow } from "./extract";

const sample = path.resolve(process.cwd(), "examples/coffee.sysml");

describe("extractFlow (integration, real parser)", () => {
  it("extracts behaviours, flow nodes, edges, decisions and guards", async () => {
    const text = fs.readFileSync(sample, "utf8");
    const { document } = await parseText(sample, text);
    const pkg = allPackages(document).find((p: any) => p.declaredName === "CoffeeMachine");
    expect(pkg).toBeTruthy();

    const model = extractFlow(pkg);
    const brew = model.groups.find((g) => g.label === "BrewCoffee");
    expect(brew).toBeTruthy();

    // all action/decision nodes are present, noise (attributes/parts) excluded
    expect(brew!.nodes.map((n) => n.label).sort()).toEqual(
      ["checkResult", "checkWater", "fill", "grind", "heat", "pour"]
    );
    expect(brew!.nodes.find((n) => n.label === "waterOk")).toBeUndefined();
    expect(brew!.nodes.find((n) => n.label === "Tank")).toBeUndefined();

    // the decision is a decision-kind node
    expect(brew!.nodes.find((n) => n.label === "checkResult")!.kind).toBe("decision");

    // guarded transitions become edge labels
    expect(brew!.edges.map((e) => e.label).filter(Boolean).sort()).toEqual([
      "not waterOk",
      "waterOk",
    ]);
    expect(brew!.edges.length).toBe(6);

    // second behaviour
    const maint = model.groups.find((g) => g.label === "Maintenance");
    expect(maint!.nodes.length).toBe(2);
    expect(maint!.edges.length).toBe(1);
  });
});
