import type { SysmlNode } from "../sysml/parser";
import type { TableModel } from "./table";
import { requirementsTable, interfacesTable, elementsTable } from "./presets";
import { buildConfigTable, type TableSpec } from "./config";

export type { TableModel } from "./table";
export { tableToHtml } from "./table";
export { parseTableConfig, type TableSpec } from "./config";

/** A selectable table: built-in preset or user-configured. */
export interface TableProvider {
  id: string;
  title: string;
  /** true for user-configured tables (from a .table.json). */
  custom?: boolean;
  build(pkg: SysmlNode): TableModel;
}

const PRESETS: TableProvider[] = [
  { id: "requirements", title: "Requirements", build: requirementsTable },
  { id: "interfaces", title: "Interfaces (ports / parts / flows)", build: interfacesTable },
  { id: "elements", title: "Elements (any type)", build: elementsTable },
];

/**
 * All selectable tables: the built-in presets plus any from the config specs.
 * Custom ids that collide with a preset (or an earlier custom table) are ignored,
 * so every table is reachable by a unique id.
 */
export function tableProviders(specs: TableSpec[] = []): TableProvider[] {
  const seen = new Set(PRESETS.map((p) => p.id));
  const custom: TableProvider[] = [];
  for (const s of specs) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    custom.push({ id: s.id, title: s.title ?? s.id, custom: true, build: (pkg: SysmlNode) => buildConfigTable(pkg, s) });
  }
  return [...PRESETS, ...custom];
}
