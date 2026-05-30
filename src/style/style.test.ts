import { describe, it, expect } from "vitest";
import { parseStyleSheet, matchStyle, styleToClassDef, buildClassDefs } from "./style";

const sheet = parseStyleSheet({
  name: "Test",
  rules: [
    { type: "LogicalComponent", style: { fill: "#bdd7ee" } },
    { nativeType: "ActionUsage", style: { fill: "#c6e0b4" } },
    { nativeType: "PartUsage", type: "PhysicalNode", style: { fill: "#ffe699" } },
  ],
});

describe("style engine", () => {
  it("matches on conformed type (hierarchy already flattened in typeChain)", () => {
    const s = matchStyle(sheet, { nativeType: "PartDefinition", typeChain: ["Pkg::Radio", "LogicalComponent"] });
    expect(s?.fill).toBe("#bdd7ee");
  });

  it("matches on native type", () => {
    const s = matchStyle(sheet, { nativeType: "ActionUsage", typeChain: [] });
    expect(s?.fill).toBe("#c6e0b4");
  });

  it("ANDs nativeType and type when both present", () => {
    expect(matchStyle(sheet, { nativeType: "PartUsage", typeChain: ["PhysicalNode"] })?.fill).toBe("#ffe699");
    // right type but wrong native type -> third rule misses; no other rule matches
    expect(matchStyle(sheet, { nativeType: "PartDefinition", typeChain: ["PhysicalNode"] })).toBeUndefined();
  });

  it("returns the first matching rule", () => {
    const s = matchStyle(sheet, { nativeType: "ActionUsage", typeChain: ["LogicalComponent"] });
    expect(s?.fill).toBe("#bdd7ee"); // LogicalComponent rule comes first
  });

  it("returns undefined when nothing matches", () => {
    expect(matchStyle(sheet, { nativeType: "AttributeUsage", typeChain: ["String"] })).toBeUndefined();
  });

  it("renders a classDef body", () => {
    expect(styleToClassDef({ fill: "#abc", stroke: "#123", color: "#000" })).toBe(
      "fill:#abc,stroke:#123,color:#000"
    );
  });

  it("deduplicates identical styles into shared class names", () => {
    const { classNameFor, classDefLines } = buildClassDefs();
    const a = classNameFor({ fill: "#abc" });
    const b = classNameFor({ fill: "#abc" });
    const c = classNameFor({ fill: "#def" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(classDefLines().length).toBe(2);
  });

  it("rejects an invalid style file", () => {
    expect(() => parseStyleSheet({})).toThrow();
    expect(() => parseStyleSheet({ rules: [{ style: {} }] })).toThrow();
  });
});
