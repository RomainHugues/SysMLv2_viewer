import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { schedule } from "./schedule";
import { extractGantt } from "./extract";

describe("schedule (critical path method)", () => {
  it("computes earliest starts and the zero-slack critical path", () => {
    const r = schedule([
      { id: "a", duration: 2, deps: [] },
      { id: "b", duration: 3, deps: ["a"] },
      { id: "c", duration: 1, deps: ["a"] }, // shorter branch -> has slack
      { id: "d", duration: 1, deps: ["b", "c"] },
    ]);
    expect(r.start.get("b")).toBe(2);
    expect(r.start.get("d")).toBe(5); // after max(b@5, c@3)
    expect([...r.critical].sort()).toEqual(["a", "b", "d"]);
    expect(r.critical.has("c")).toBe(false);
  });

  it("does not hang on a cyclic dependency graph", () => {
    const r = schedule([
      { id: "x", duration: 1, deps: ["y"] },
      { id: "y", duration: 1, deps: ["x"] },
    ]);
    expect(r.start.size).toBe(2);
  });
});

describe("extractGantt (integration)", () => {
  it("reads duration/resource, schedules, and flags the critical path", async () => {
    const sample = path.resolve(process.cwd(), "examples/gantt/mission.sysml");
    const { document } = await parseText(sample, fs.readFileSync(sample, "utf8"));
    const pkg = allPackages(document).find((p: any) => p.declaredName === "MissionSchedule");
    const m = extractGantt(pkg);
    const task = (n: string) => m.tasks.find((t) => t.name === n)!;

    expect(m.tasks).toHaveLength(7);
    expect(task("acquire").duration).toBe(2);
    expect(task("acquire").resource).toBe("Sensor");
    expect(task("engage").start).toBe(11); // after classify (finishes day 11)

    // critical path: the 16-day chain; the short "assess" branch is not on it
    expect(task("classify").critical).toBe(true);
    expect(task("engage").critical).toBe(true);
    expect(task("assess").critical).toBe(false);

    // one colour per resource
    expect(Object.keys(m.resourceColors)).toEqual(
      expect.arrayContaining(["Sensor", "CPU", "GPU", "Effector", "Comms"])
    );
    expect(m.resourceColors["Sensor"]).not.toBe(m.resourceColors["GPU"]);
  });
});
