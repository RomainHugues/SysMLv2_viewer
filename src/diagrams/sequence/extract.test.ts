import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseText } from "../../sysml/parser";
import { allPackages } from "../../sysml/packageAtCursor";
import { extractSequence } from "./extract";

const sample = path.resolve(process.cwd(), "examples/order_protocol.sysml");

describe("extractSequence (integration)", () => {
  it("extracts participants (in order) and directed messages from flows", async () => {
    const text = fs.readFileSync(sample, "utf8");
    const { document } = await parseText(sample, text);
    const pkg = allPackages(document).find((p: any) => p.declaredName === "OrderProtocol");
    const model = extractSequence(pkg);

    expect(model.participants.map((p) => p.name)).toEqual(["customer", "shop", "warehouse"]);
    expect(model.messages).toEqual([
      { from: "customer", to: "shop", label: "placeOrder" },
      { from: "shop", to: "warehouse", label: "checkStock" },
      { from: "warehouse", to: "shop", label: "stockOk" },
      { from: "shop", to: "customer", label: "confirm" },
    ]);
  });
});
