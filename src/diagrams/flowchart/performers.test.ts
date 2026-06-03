import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractFlow } from "./extract";
import { flowToMermaid } from "./mermaid";
import type { FlowModel } from "../ir";

const sample = path.resolve(process.cwd(), "examples/chains/surveillance.sysml");

describe("performers (integration)", () => {
  it("adds performer parts and dashed perform edges from each action to its part", async () => {
    const { document } = await parseText(sample, fs.readFileSync(sample, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "SurveillanceArchitecture");
    const g = extractFlow(pkg).groups.find((x) => x.label === "MissionThread")!;
    const node = (n: string) => g.nodes.find((x) => x.label === n)!;

    // the 5 performer parts are part-kind nodes
    const parts = g.nodes.filter((n) => n.kind === "part").map((n) => n.label).sort();
    expect(parts).toEqual(["comms", "effector", "recorder", "sensor", "tracker"]);

    // `sensor` performs both `sense` and `detect` -> two perform edges into it
    const intoSensor = g.edges.filter((e) => e.kind === "perform" && e.target === node("sensor").id);
    expect(intoSensor.map((e) => e.source).sort()).toEqual([node("detect").id, node("sense").id].sort());

    // a perform edge is an allocation link, distinct from a succession (flow) edge
    const flow = g.edges.find((e) => e.source === node("detect").id && e.target === node("identify").id)!;
    expect(flow.kind).toBeUndefined();
  });
});

describe("flowToMermaid (parts + default colour code)", () => {
  const model: FlowModel = {
    groups: [
      {
        id: "P::Act",
        label: "Act",
        nodes: [
          { id: "P::Act::do", label: "do", kind: "action" },
          { id: "P::comp", label: "comp", kind: "part" },
        ],
        edges: [{ source: "P::Act::do", target: "P::comp", kind: "perform" }],
      },
    ],
  };
  const out = flowToMermaid(model, { direction: "TB" });

  it("renders a part with the subroutine shape", () => {
    expect(out).toMatch(/n\d+\[\["comp"\]\]/);
  });

  it("renders a perform edge as a dashed link", () => {
    expect(out).toMatch(/n\d+ -\.-> n\d+/);
  });

  it("applies a default fill to every node even without a style file", () => {
    // action default blue, part default green
    expect(out).toContain("fill:#e8f1fb"); // action
    expect(out).toContain("fill:#e7f5e9"); // part
  });

  it("adds a node-kind legend when parts are present", () => {
    expect(out).toContain('subgraph kindLegend ["Legend"]');
    expect(out).toMatch(/klAction -\.->\|"performed by"\| klPart/);
  });

  it("lets a style file override the default fill", () => {
    const styled: FlowModel = {
      groups: [
        {
          id: "g",
          label: "g",
          nodes: [{ id: "a", label: "a", kind: "action", style: { fill: "#123456" } }],
          edges: [],
        },
      ],
    };
    const o = flowToMermaid(styled, { direction: "TB" });
    expect(o).toContain("fill:#123456");
    expect(o).not.toContain("fill:#e8f1fb");
  });
});
