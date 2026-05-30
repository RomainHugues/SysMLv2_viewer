import { describe, it, expect } from "vitest";
import { flowToMermaid } from "./mermaid";
import type { FlowModel } from "../ir";

const model: FlowModel = {
  groups: [
    {
      id: "P::Brew",
      label: "Brew",
      nodes: [
        { id: "P::Brew::grind", label: "grind", kind: "action" },
        { id: "P::Brew::check", label: "check", kind: "decision" },
        { id: "P::Brew::heat", label: "heat", kind: "action" },
      ],
      edges: [
        { source: "P::Brew::grind", target: "P::Brew::check" },
        { source: "P::Brew::check", target: "P::Brew::heat", label: "ok" },
      ],
    },
  ],
};

describe("flowToMermaid", () => {
  const out = flowToMermaid(model, { direction: "LR" });

  it("starts with the flowchart header and direction", () => {
    expect(out.split("\n")[0]).toBe("flowchart LR");
  });

  it("wraps each behaviour in a subgraph", () => {
    expect(out).toContain('subgraph g0 ["Brew"]');
    expect(out).toContain("end");
  });

  it("renders an action as a rectangle and a decision as a diamond", () => {
    expect(out).toMatch(/n\d+\["grind"\]/);
    expect(out).toMatch(/n\d+\{"check"\}/);
  });

  it("renders a plain edge and a guarded edge with its label", () => {
    expect(out).toMatch(/n\d+ --> n\d+/);
    expect(out).toMatch(/n\d+ -->\|"ok"\| n\d+/);
  });

  it("never emits raw qualified-name ids (':' is illegal in mermaid ids)", () => {
    const body = out.split("\n").slice(1).join("\n");
    // ids are n0, n1, ...; "::" must only appear inside quoted labels, not as ids
    expect(body).not.toMatch(/(^|\s)[A-Za-z0-9_]*::[A-Za-z0-9_]*(\s|\[|\{)/);
  });
});
