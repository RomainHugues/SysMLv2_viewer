import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractClass } from "./extract";
import { classToSvg } from "./svg";
import type { ClassModel } from "./ir";

const sample = path.resolve(process.cwd(), "examples/vehicle.sysml");

async function vehicleModel(): Promise<ClassModel> {
  const text = fs.readFileSync(sample, "utf8");
  const { document } = await parseText(sample, text);
  const pkg = allPackages(document).find((p: any) => p.declaredName === "VehicleModel");
  return extractClass(pkg);
}

describe("classToSvg (dagre + SVG renderer)", () => {
  it("renders a self-contained SVG with one group per class", async () => {
    const model = await vehicleModel();
    const svg = classToSvg(model);

    // A standalone, namespaced SVG with a numeric viewBox (laid out by dagre).
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    expect(vb).not.toBeNull();
    expect(Number(vb![1])).toBeGreaterThan(0);
    expect(Number(vb![2])).toBeGreaterThan(0);

    // One <g transform> per class node inside the nodes layer.
    const nodeGroups = (svg.match(/<g transform="translate\(/g) ?? []).length;
    expect(nodeGroups).toBeGreaterThanOrEqual(model.classes.length);

    // Class names and a member appear as drawn text.
    expect(svg).toContain(">Vehicle<");
    expect(svg).toContain("+ mass : Real");
  });

  it("uses the right marker per relation kind", async () => {
    const model = await vehicleModel();
    const svg = classToSvg(model);
    // Car/Truck <|-- Vehicle => generalization triangle; Vehicle *-- Engine => diamond.
    expect(svg).toContain("url(#celeris-gen)"); // inheritance
    expect(svg).toContain("url(#celeris-diamond)"); // composition
  });

  it("draws the enumeration stereotype and literals", async () => {
    const model = await vehicleModel();
    const svg = classToSvg(model);
    expect(svg).toContain("«enumeration»");
    expect(svg).toContain(">park<");
  });

  it("applies a style fill to the box", () => {
    const model: ClassModel = {
      classes: [
        { id: "A", name: "A", members: [], literals: [], style: { fill: "#ffcc00", stroke: "#a60" } },
      ],
      relations: [],
    };
    const svg = classToSvg(model);
    expect(svg).toContain('fill="#ffcc00"');
    expect(svg).toContain('stroke="#a60"');
  });

  it("escapes special characters in labels", () => {
    const model: ClassModel = {
      classes: [{ id: "X", name: "A<b>&", members: [], literals: [] }],
      relations: [],
    };
    const svg = classToSvg(model);
    expect(svg).toContain("A&lt;b&gt;&amp;");
    expect(svg).not.toContain(">A<b>&<");
  });
});
