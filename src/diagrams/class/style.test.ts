import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractClass } from "./extract";
import { parseStyleSheet } from "../../style/style";

const model = path.resolve(process.cwd(), "examples/arcadia/drone_system.sysml");
const styleFile = path.resolve(process.cwd(), "examples/arcadia/arcadia.style.json");

describe("Arcadia styling (integration)", () => {
  it("colors components by their Arcadia type, following the hierarchy", async () => {
    const { document } = await parseText(model, fs.readFileSync(model, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "DroneSystem");
    const sheet = parseStyleSheet(JSON.parse(fs.readFileSync(styleFile, "utf8")));

    const m = extractClass(pkg, sheet);
    const fill = (name: string) => m.classes.find((c) => c.name === name)?.style?.fill;

    expect(fill("Operator")).toBe("#f8cbad"); // OperationalEntity -> orange
    expect(fill("FlightController")).toBe("#bdd7ee"); // LogicalComponent -> blue (via :>)
    expect(fill("Camera")).toBe("#bdd7ee"); // LogicalComponent -> blue
    expect(fill("OnboardComputer")).toBe("#ffe699"); // PhysicalNode -> yellow
  });

  it("applies no style when no style sheet is given", async () => {
    const { document } = await parseText(model, fs.readFileSync(model, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "DroneSystem");
    const m = extractClass(pkg);
    expect(m.classes.every((c) => c.style === undefined)).toBe(true);
  });
});
