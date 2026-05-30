import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractState } from "./extract";

const sample = path.resolve(process.cwd(), "examples/traffic_light.sysml");

describe("extractState (integration)", () => {
  it("extracts a state machine, its states and transitions (incl. initial)", async () => {
    const text = fs.readFileSync(sample, "utf8");
    const { document } = await parseText(sample, text);
    const pkg = allPackages(document).find((p: any) => p.declaredName === "TrafficLightSM");
    const model = extractState(pkg);

    expect(model.machines.length).toBe(1);
    const m = model.machines[0];
    expect(m.name).toBe("TrafficLight");
    expect(m.states.map((s) => s.name).sort()).toEqual(["Green", "Off", "Red", "Yellow"]);

    // initial transition: no source, target Off
    expect(m.transitions.some((t) => !t.source && t.target === "Off")).toBe(true);
    // a regular transition
    expect(m.transitions.some((t) => t.source === "Off" && t.target === "Red")).toBe(true);
  });
});
