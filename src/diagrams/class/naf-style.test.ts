import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractClass } from "./extract";
import { parseStyleSheet } from "../../style/style";

const model = path.resolve(process.cwd(), "examples/naf/c2_system.sysml");
const styleFile = path.resolve(process.cwd(), "examples/naf/naf.style.json");

describe("NAF v4 styling (integration)", () => {
  it("colors elements by NAF grid layer, following the hierarchy", async () => {
    const { document } = await parseText(model, fs.readFileSync(model, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "C2System");
    const sheet = parseStyleSheet(JSON.parse(fs.readFileSync(styleFile, "utf8")));

    const m = extractClass(pkg, sheet);
    const fill = (name: string) => m.classes.find((c) => c.name === name)?.style?.fill;

    expect(fill("CommandAndControl")).toBe("#c9b3e0"); // Capability -> purple
    expect(fill("TrackingService")).toBe("#9dc3e6"); // Service -> blue
    expect(fill("CommandPost")).toBe("#a9d08e"); // LogicalNode -> green
    expect(fill("Radar")).toBe("#f4b183"); // PhysicalResource -> orange
  });
});
