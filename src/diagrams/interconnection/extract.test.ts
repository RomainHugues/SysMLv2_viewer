import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractInterconnection } from "./extract";

async function model(file: string) {
  const p = path.resolve(process.cwd(), file);
  const { document } = await parseText(p, fs.readFileSync(p, "utf8"));
  return extractInterconnection(allPackages(document)[0]);
}

describe("extractInterconnection — behaviour (flows + in/out)", () => {
  it("blocks carry directed parameters and flows connect out -> in", async () => {
    const m = await model("examples/interconnection/signal_chain.sysml");
    const g = m.groups.find((x) => x.label === "SurveillanceThread")!;
    expect(g.kind).toBe("action");

    const acquire = g.blocks.find((b) => b.id === "acquire")!;
    expect(acquire.ports.find((p) => p.id === "reading")!.direction).toBe("out");
    const filtering = g.blocks.find((b) => b.id === "filtering")!;
    expect(filtering.ports.find((p) => p.id === "raw")!.direction).toBe("in");

    const flow = g.connectors.find(
      (c) => c.source.block === "acquire" && c.source.port === "reading"
    )!;
    expect(flow.kind).toBe("flow");
    expect(flow.target).toEqual({ block: "filtering", port: "raw" });
  });
});

describe("extractInterconnection — synthesised blocks & ports", () => {
  // A connector may reference a block whose type is unresolved (ports come only
  // from the ends) or a block that is never declared as an owned usage at all.
  const text = `package Edge {
    port def DataPort;
    part def Known { port p : DataPort; }
    part def Ctx {
        part known : Known;
        part mystery : Unresolved;
        connect known.p to mystery.q;
        connect known.p to ghost.r;
    }
}`;

  it("creates blocks/ports from connector ends and falls back when the type is unresolved", async () => {
    const { document } = await parseText("examples/interconnection/_edge.sysml", text);
    const g = extractInterconnection(allPackages(document)[0]).groups.find((x) => x.label === "Ctx")!;
    const block = (id: string) => g.blocks.find((b) => b.id === id)!;

    // declared block with a resolvable type contributes its port
    expect(block("known").ports.map((p) => p.id)).toContain("p");

    // block typed by an unresolved def: type name kept, port only from the end
    expect(block("mystery").type).toBe("Unresolved");
    expect(block("mystery").ports.map((p) => p.id)).toEqual(["q"]);

    // block referenced only inside a connector is synthesised
    expect(block("ghost")).toBeTruthy();
    expect(block("ghost").ports.map((p) => p.id)).toEqual(["r"]);

    // ends are parsed to {block, port}
    const c = g.connectors.find((x) => x.target.block === "mystery")!;
    expect(c).toMatchObject({ source: { block: "known", port: "p" }, target: { block: "mystery", port: "q" }, kind: "connect" });
  });
});

describe("extractInterconnection — structure (ports + connect/interface)", () => {
  it("blocks carry ports, a typed interface and plain connects", async () => {
    const m = await model("examples/interconnection/avionics_power.sysml");
    const g = m.groups.find((x) => x.label === "Avionics")!;
    expect(g.kind).toBe("part");

    const battery = g.blocks.find((b) => b.id === "battery")!;
    expect(battery.ports.map((p) => p.id)).toContain("power");

    const iface = g.connectors.find((c) => c.kind === "interface")!;
    expect(iface.source).toEqual({ block: "battery", port: "power" });
    expect(iface.target).toEqual({ block: "bus", port: "feed" });
    expect(iface.label).toBe("supply");

    expect(g.connectors.some((c) => c.kind === "connect")).toBe(true);
  });
});
