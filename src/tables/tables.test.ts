import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../sysml/parser";
import { allPackages } from "../sysml/packageAtCursor";
import { requirementsTable, interfacesTable, elementsTable } from "./presets";
import { buildConfigTable, parseTableConfig } from "./config";
import { tableToHtml } from "./table";
import { tableProviders } from "./index";

async function inline(text: string, name: string) {
  const { document } = await parseText("t.sysml", text);
  return allPackages(document).find((p: any) => p.declaredName === name);
}

async function pkg(file: string) {
  const p = path.resolve(process.cwd(), file);
  const { document } = await parseText(p, fs.readFileSync(p, "utf8"));
  return allPackages(document)[0];
}

describe("table presets", () => {
  it("requirements: id, text, subject, derived-from", async () => {
    const m = requirementsTable(await pkg("examples/tables/system.sysml"));
    expect(m.headers).toContain("Satisfied by");
    const row = (id: string) => m.rows.find((r) => r[0] === id)!;
    expect(row("LatencyReq")[2]).toBe("Controller"); // subject
    expect(row("LatencyReq")[3]).toBe("SafetyReq"); // derived from
    expect(row("LatencyReq")[1]).toMatch(/latency/i); // text/doc
  });

  it("interfaces: each connection with its ends and the flows traversing it", async () => {
    const m = interfacesTable(await pkg("examples/tables/system.sysml"));
    const sensing = m.rows.find((r) => r[0] === "sensing")!;
    expect(sensing[1]).toBe("interface");
    expect(sensing[2]).toBe("sensor.data");
    expect(sensing[3]).toBe("controller.sensorIn");
    expect(sensing[4]).not.toBe(""); // an item flow traverses this interface
  });

  it("elements: any named definition/usage with kind and type", async () => {
    const m = elementsTable(await pkg("examples/tables/system.sysml"));
    const names = m.rows.map((r) => r[0]);
    expect(names).toContain("Sensor");
    const sensor = m.rows.find((r) => r[0] === "sensor")!;
    expect(sensor[1]).toBe("part"); // kind
    expect(sensor[2]).toBe("Sensor"); // type
  });
});

describe("configured tables", () => {
  it("selects by conformed type and by $type", async () => {
    const p = await pkg("examples/tables/system.sysml");
    const specs = parseTableConfig(JSON.parse(fs.readFileSync(
      path.resolve(process.cwd(), "examples/tables/celeris.table.json"), "utf8")));

    const logical = buildConfigTable(p, specs.find((s) => s.id === "logical-components")!);
    expect(logical.rows.map((r) => r[0])).toEqual(expect.arrayContaining(["Sensor", "Controller", "System"]));

    const functions = buildConfigTable(p, specs.find((s) => s.id === "functions")!);
    expect(functions.rows.map((r) => r[0])).toEqual(expect.arrayContaining(["Acquire", "Control"]));
  });

  it("an empty/typeless select matches nothing", async () => {
    const p = await pkg("examples/tables/system.sysml");
    expect(buildConfigTable(p, { id: "x", select: {}, columns: [{ header: "N", value: "name" }] }).rows).toEqual([]);
  });
});

describe("review fixes", () => {
  it("requirements: satisfied-by resolves a qualified satisfy target's last segment", async () => {
    const pkg = await inline(
      `package T { requirement def SafetyReq { doc /* x */ } part def Sys { satisfy T::SafetyReq; } }`, "T");
    const row = requirementsTable(pkg).rows.find((r) => r[0] === "SafetyReq")!;
    expect(row[4]).toContain("Sys");
  });

  it("interfaces: a flow is attributed only to the interface with its exact ports", async () => {
    const pkg = await inline(`package T {
      port def P;
      interface def L { end s : P; end t : P; }
      part def A { port p1 : P; port p2 : P; }
      part def B { port q1 : P; port q2 : P; }
      part def Sys {
        part a : A;
        part b : B;
        interface i1 : L connect a.p1 to b.q1;
        interface i2 : L connect a.p2 to b.q2;
        flow from a.p1 to b.q1;
      }
    }`, "T");
    const m = interfacesTable(pkg);
    expect(m.rows.find((r) => r[0] === "i1")![4]).not.toBe(""); // flow on i1
    expect(m.rows.find((r) => r[0] === "i2")![4]).toBe(""); // not on i2 (different ports)
  });

  it("tableProviders ignores a custom id colliding with a preset", () => {
    const provs = tableProviders(parseTableConfig({
      tables: [{ id: "requirements", title: "Mine", select: { type: "PartDefinition" }, columns: [{ header: "N", value: "name" }] }],
    }));
    const reqs = provs.filter((p) => p.id === "requirements");
    expect(reqs).toHaveLength(1);
    expect(reqs[0].custom).toBeUndefined(); // the preset wins
  });
});

describe("tableToHtml", () => {
  it("renders a styled table and escapes cells", () => {
    const html = tableToHtml({ title: "T", headers: ["A"], rows: [['<b>&"x']] });
    expect(html).toContain('<table class="celeris-table">');
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("&lt;b&gt;&amp;&quot;x");
    expect(html).not.toContain("<b>&\"x");
  });
});
