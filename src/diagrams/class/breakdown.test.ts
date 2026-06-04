import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractClass } from "./extract";

const sample = path.resolve(process.cwd(), "examples/breakdown/function_breakdown.sysml");

describe("class diagram as a BDD (function breakdown)", () => {
  it("renders action defs as «action» boxes decomposed by composition", async () => {
    const { document } = await parseText(sample, fs.readFileSync(sample, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "FunctionBreakdown");
    const model = extractClass(pkg);
    const node = (n: string) => model.classes.find((c) => c.name === n)!;
    const comp = (s: string, t: string) =>
      model.relations.find(
        (r) => r.kind === "composition" && r.source === node(s).id && r.target === node(t).id
      );

    // every function is a box with the «action» stereotype
    expect(node("Mission").stereotype).toBe("action");
    expect(model.classes.filter((c) => c.stereotype === "action")).toHaveLength(9);

    // decomposition is rendered as composition (whole-part)
    expect(comp("Mission", "Surveil")).toBeTruthy();
    expect(comp("Mission", "Engage")).toBeTruthy();
    expect(comp("Surveil", "Detect")).toBeTruthy();
    expect(comp("Engage", "Fire")).toBeTruthy();

    // the usage name labels the edge
    expect(comp("Mission", "Surveil")!.label).toBe("surveil");
  });
});
