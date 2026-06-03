import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractFlow } from "./extract";

const sample = path.resolve(process.cwd(), "examples/chains/surveillance.sysml");

describe("functional chains (integration)", () => {
  it("tags functions and flows with their chains; the shared function is in all chains", async () => {
    const { document } = await parseText(sample, fs.readFileSync(sample, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "SurveillanceArchitecture");
    const model = extractFlow(pkg);
    const g = model.groups.find((x) => x.label === "MissionThread")!;
    const node = (n: string) => g.nodes.find((x) => x.label === n)!;

    // `identify` is performed by all three use-case chains -> the shared function
    expect(node("identify").chains?.slice().sort()).toEqual(["Archival", "Engagement", "Reporting"]);
    expect(node("detect").chains).toEqual(["Engagement"]);
    expect(node("sense").chains).toEqual(["Reporting"]);
    expect(node("archive").chains).toEqual(["Archival"]);

    // a perform done by a performer part (not a use case) does not create a chain
    expect(node("detect").chains).not.toContain("Sensor");

    // an edge belongs to the chain shared by both endpoints
    const e = g.edges.find((x) => x.source === node("detect").id && x.target === node("identify").id)!;
    expect(e.chains).toEqual(["Engagement"]);
  });
});
