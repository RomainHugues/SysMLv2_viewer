import type { SysmlNode } from "../../sysml/parser";
import type { IbdModel, IbdGroup, IbdBlock, IbdPort, IbdConnector, ConnectorKind, PortDirection } from "./ir";
import { childNodes, nameOf, qnOf, cstText, ownedElements } from "../ast";

const CONNECTOR_KIND: Record<string, ConnectorKind> = {
  ConnectionUsage: "connect",
  InterfaceUsage: "interface",
  FlowConnectionUsage: "flow",
};
const CONTEXT_DEFS = new Set(["PartDefinition", "ActionDefinition"]);
const BLOCK_USAGE: Record<string, "part" | "action"> = { PartUsage: "part", ActionUsage: "action" };

function directionOf(node: SysmlNode): PortDirection | undefined {
  const d = (node as any)?.direction;
  return d === "in" || d === "out" || d === "inout" ? d : undefined;
}

/** Short name of a usage's declared type (resolved, else from the `: Type` text). */
function typeName(usage: SysmlNode): string | undefined {
  try {
    const t = [...(usage.$meta?.types?.() ?? [])][0];
    if (t?.name) return t.name as string;
    if (t?.qualifiedName) return (t.qualifiedName as string).split("::").pop();
  } catch {
    /* unresolved */
  }
  const m = cstText(usage).match(/:\s*([\w:.]+)/);
  return m ? m[1].split("::").pop() : undefined;
}

function typeQn(usage: SysmlNode): string | undefined {
  try {
    return [...(usage.$meta?.types?.() ?? [])][0]?.qualifiedName;
  } catch {
    return undefined;
  }
}

/** Every definition anywhere under the package, indexed by qualified name and name. */
function definitionIndex(pkg: SysmlNode): { byQn: Map<string, SysmlNode>; byName: Map<string, SysmlNode> } {
  const byQn = new Map<string, SysmlNode>();
  const byName = new Map<string, SysmlNode>();
  const seen = new Set<SysmlNode>();
  const walk = (n: SysmlNode): void => {
    for (const c of childNodes(n)) {
      if (seen.has(c)) continue;
      seen.add(c);
      if (c.$type.endsWith("Definition")) {
        const qn = qnOf(c);
        if (qn) byQn.set(qn, c);
        byName.set(nameOf(c), c);
      }
      walk(c);
    }
  };
  walk(pkg);
  return { byQn, byName };
}

/** Ports / directed parameters declared by a definition. */
function portsOfDef(def: SysmlNode): IbdPort[] {
  const out: IbdPort[] = [];
  const push = (u: SysmlNode) => {
    const name = nameOf(u);
    out.push({ id: name, name, direction: directionOf(u), type: typeName(u) });
  };
  for (const p of ownedElements(def, (t) => t === "PortUsage")) push(p);
  for (const r of ownedElements(def, (t) => t === "ReferenceUsage")) {
    if (directionOf(r)) push(r); // directed reference = in/out parameter
  }
  return out;
}

/** [block, port?] from a connector end's text, e.g. "sensor.pwr" -> ["sensor","pwr"]. */
function parseEnd(end: SysmlNode): { block: string; port?: string } {
  const text = cstText(end).trim().split(/\s+/)[0] ?? "";
  const dot = text.indexOf(".");
  if (dot < 0) return { block: text };
  return { block: text.slice(0, dot), port: text.slice(dot + 1) };
}

/** Context definitions: a part/action def that owns at least one connector. */
function contexts(pkg: SysmlNode): SysmlNode[] {
  const out: SysmlNode[] = [];
  const seen = new Set<SysmlNode>();
  const walk = (n: SysmlNode): void => {
    for (const c of childNodes(n)) {
      if (seen.has(c)) continue;
      seen.add(c);
      if (CONTEXT_DEFS.has(c.$type) && ownedElements(c, (t) => t in CONNECTOR_KIND).length > 0) {
        out.push(c);
      }
      walk(c);
    }
  };
  walk(pkg);
  return out;
}

export function extractInterconnection(pkg: SysmlNode): IbdModel {
  const { byQn, byName } = definitionIndex(pkg);
  const groups: IbdGroup[] = [];

  for (const ctx of contexts(pkg)) {
    const blocks: IbdBlock[] = [];
    const byId = new Map<string, IbdBlock>();

    const ensureBlock = (id: string, kind: "part" | "action" = "part"): IbdBlock => {
      let b = byId.get(id);
      if (!b) {
        b = { id, name: id, kind, ports: [] };
        blocks.push(b);
        byId.set(id, b);
      }
      return b;
    };
    const ensurePort = (b: IbdBlock, port: string): void => {
      if (!b.ports.some((p) => p.id === port)) b.ports.push({ id: port, name: port });
    };

    // 1) blocks = owned part/action usages, with ports from their type definition
    for (const [usage, kind] of ownedUsages(ctx)) {
      const id = nameOf(usage);
      const b = ensureBlock(id, kind);
      b.kind = kind;
      b.type = typeName(usage);
      const def = (typeQn(usage) && byQn.get(typeQn(usage)!)) || (b.type ? byName.get(b.type) : undefined);
      if (def) for (const p of portsOfDef(def)) if (!b.ports.some((q) => q.id === p.id)) b.ports.push(p);
      // ports declared directly on the usage too
      for (const p of portsOfDef(usage)) if (!b.ports.some((q) => q.id === p.id)) b.ports.push(p);
    }

    // 2) connectors = owned connection / interface / flow usages
    const connectors: IbdConnector[] = [];
    for (const conn of ownedElements(ctx, (t) => t in CONNECTOR_KIND)) {
      const ends: SysmlNode[] = Array.isArray((conn as any).ends) ? (conn as any).ends : [];
      if (ends.length < 2) continue;
      const a = parseEnd(ends[0]);
      const z = parseEnd(ends[1]);
      if (!a.block || !z.block) continue;
      const kind = CONNECTOR_KIND[conn.$type];
      const sb = ensureBlock(a.block);
      const tb = ensureBlock(z.block);
      if (a.port) ensurePort(sb, a.port);
      if (z.port) ensurePort(tb, z.port);
      connectors.push({
        source: { block: a.block, port: a.port },
        target: { block: z.block, port: z.port },
        kind,
        label: connectorLabel(conn, kind, a.port),
      });
    }

    if (blocks.length === 0) continue;
    const actions = blocks.filter((b) => b.kind === "action").length;
    groups.push({
      id: qnOf(ctx) ?? nameOf(ctx),
      label: nameOf(ctx),
      kind: actions > blocks.length - actions ? "action" : "part",
      blocks,
      connectors,
    });
  }

  return { groups };
}

/** Part/action usages directly owned by a context definition. */
function ownedUsages(ctx: SysmlNode): Array<[SysmlNode, "part" | "action"]> {
  const out: Array<[SysmlNode, "part" | "action"]> = [];
  for (const child of childNodes(ctx)) {
    for (const el of [child, ...childNodes(child)]) {
      const kind = BLOCK_USAGE[el.$type];
      if (kind) out.push([el, kind]);
    }
  }
  return out;
}

/** Edge label: interface name/type for connect/interface, flowed item for a flow. */
function connectorLabel(conn: SysmlNode, kind: ConnectorKind, sourcePort?: string): string | undefined {
  const name = conn.declaredName as string | undefined;
  if (kind === "flow") return name || sourcePort || undefined;
  if (kind === "interface") return name || typeName(conn) || undefined;
  return name || undefined; // plain connect: usually unlabelled
}
