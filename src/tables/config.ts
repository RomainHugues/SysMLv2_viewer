import type { SysmlNode } from "../sysml/parser";
import type { TableModel } from "./table";
import { childNodes, nameOf, qnOf, cstText, docOf, styleInfo } from "../diagrams/ast";
import { collect, typeNames, kindLabel } from "./presets";

// A user-defined table (from a .table.json config). Rows are the elements matched
// by `select`; each column reads a value via a small accessor vocabulary.
export interface TableColumnSpec {
  header: string;
  /** name | qualifiedName | kind | type | doc | stereotype | attribute:<name> */
  value: string;
}
export interface TableSpec {
  id: string;
  title?: string;
  select: { type?: string | string[]; conformsTo?: string | string[] };
  columns: TableColumnSpec[];
}

function asArray(v: string | string[] | undefined): string[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

/** Parse and lightly validate a parsed JSON object into TableSpec[]. */
export function parseTableConfig(json: unknown): TableSpec[] {
  const tables = (json as any)?.tables;
  if (!Array.isArray(tables)) return [];
  return tables
    .filter((t) => t && typeof t.id === "string" && Array.isArray(t.columns))
    .map((t) => ({
      id: t.id,
      title: typeof t.title === "string" ? t.title : t.id,
      select: { type: t.select?.type, conformsTo: t.select?.conformsTo },
      columns: t.columns
        .filter((c: any) => c && typeof c.value === "string")
        .map((c: any) => ({ header: typeof c.header === "string" ? c.header : c.value, value: c.value })),
    }));
}

function matches(el: SysmlNode, sel: TableSpec["select"]): boolean {
  const types = asArray(sel.type);
  const conforms = asArray(sel.conformsTo);
  if (types.length === 0 && conforms.length === 0) return false;
  if (types.length && !types.includes(el.$type)) return false;
  if (conforms.length) {
    const chain = styleInfo(el).typeChain;
    if (!conforms.some((c) => chain.includes(c))) return false;
  }
  return true;
}

/** Value of an owned attribute named `attr` (its assigned value, else its type). */
function attributeValue(el: SysmlNode, attr: string): string {
  for (const child of childNodes(el)) {
    for (const g of [child, ...childNodes(child)]) {
      if (/AttributeUsage$/.test(g.$type) && nameOf(g) === attr) {
        const m = cstText(g).match(/=\s*([^;{]+)/);
        if (m) return m[1].trim();
        const t = cstText(g).match(/:\s*([\w:.]+)/);
        return t ? (t[1].split("::").pop() as string) : "";
      }
    }
  }
  return "";
}

function cell(el: SysmlNode, value: string): string {
  if (value.startsWith("attribute:")) return attributeValue(el, value.slice("attribute:".length));
  switch (value) {
    case "name": return nameOf(el);
    case "qualifiedName": return qnOf(el) ?? nameOf(el);
    case "kind": return kindLabel(el.$type);
    case "type": return [...new Set(typeNames(el))].join(", ");
    case "doc": return docOf(el) ?? "";
    case "stereotype":
    case "conformsTo": return [...new Set(typeNames(el))].join(", ");
    default: return "";
  }
}

/** Build a table model from a user spec applied to a package. */
export function buildConfigTable(pkg: SysmlNode, spec: TableSpec): TableModel {
  const rows = collect(pkg, () => true)
    .filter((el) => (el as any).declaredName && matches(el, spec.select))
    .map((el) => spec.columns.map((c) => cell(el, c.value)));
  return {
    title: spec.title ?? spec.id,
    headers: spec.columns.map((c) => c.header),
    rows,
  };
}
