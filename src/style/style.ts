// Style engine: maps a diagram element (by native SysML type and/or the SysML
// type/stereotype it conforms to) to visual properties, driven by a JSON file.
import type { ElementStyleInfo } from "../diagrams/ast";

/** Visual properties for a matched element (CSS-like, applied via Mermaid classDef). */
export interface StyleProps {
  fill?: string;
  stroke?: string;
  color?: string; // text color
  strokeWidth?: string;
  strokeDasharray?: string;
}

export interface StyleRule {
  /** Match on the native SysML AST type, e.g. "PartUsage", "ActionDefinition". */
  nativeType?: string | string[];
  /**
   * Match if the element conforms to (is typed by / specializes, transitively)
   * this type. Qualified ("Arcadia::LogicalComponent") or short ("LogicalComponent").
   */
  type?: string | string[];
  style: StyleProps;
}

export interface StyleSheet {
  /** Optional human label, e.g. "Arcadia". */
  name?: string;
  rules: StyleRule[];
}

const asArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/** Validate/normalize a parsed JSON object into a StyleSheet (throws on bad shape). */
export function parseStyleSheet(data: unknown): StyleSheet {
  if (!data || typeof data !== "object") throw new Error("Style file must be a JSON object.");
  const obj = data as any;
  if (!Array.isArray(obj.rules)) throw new Error('Style file must have a "rules" array.');
  const rules: StyleRule[] = obj.rules.map((r: any, i: number) => {
    if (!r || typeof r !== "object") throw new Error(`Rule #${i} must be an object.`);
    if (r.nativeType === undefined && r.type === undefined) {
      throw new Error(`Rule #${i} must have "nativeType" and/or "type".`);
    }
    return {
      nativeType: r.nativeType,
      type: r.type,
      style: (r.style ?? {}) as StyleProps,
    };
  });
  return { name: typeof obj.name === "string" ? obj.name : undefined, rules };
}

/** True if rule matches the element. nativeType and type are ANDed; within each, ORed. */
function ruleMatches(rule: StyleRule, info: ElementStyleInfo): boolean {
  const nts = asArray(rule.nativeType);
  if (nts.length > 0 && !nts.includes(info.nativeType)) return false;
  const types = asArray(rule.type);
  if (types.length > 0 && !types.some((t) => info.typeChain.includes(t))) return false;
  return nts.length > 0 || types.length > 0;
}

/** First matching rule's style, or undefined. */
export function matchStyle(sheet: StyleSheet | undefined, info: ElementStyleInfo): StyleProps | undefined {
  if (!sheet) return undefined;
  for (const rule of sheet.rules) {
    if (ruleMatches(rule, info)) return rule.style;
  }
  return undefined;
}

/** Render a StyleProps as a Mermaid classDef body, e.g. "fill:#fed,stroke:#a60". */
export function styleToClassDef(style: StyleProps): string {
  const parts: string[] = [];
  if (style.fill) parts.push(`fill:${style.fill}`);
  if (style.stroke) parts.push(`stroke:${style.stroke}`);
  if (style.color) parts.push(`color:${style.color}`);
  if (style.strokeWidth) parts.push(`stroke-width:${style.strokeWidth}`);
  if (style.strokeDasharray) parts.push(`stroke-dasharray:${style.strokeDasharray}`);
  return parts.join(",");
}

/** Stable key for deduplicating identical styles into shared classDefs. */
export function styleKey(style: StyleProps): string {
  return styleToClassDef(style);
}

/**
 * Collect distinct styles into shared Mermaid classDef declarations. Returns the
 * `classDef <name> <body>` lines and a lookup from a node's style to its class name.
 */
export function buildClassDefs(prefix = "sty"): {
  classNameFor: (style: StyleProps | undefined) => string | undefined;
  classDefLines: () => string[];
} {
  const byKey = new Map<string, { name: string; body: string }>();
  const classNameFor = (style: StyleProps | undefined): string | undefined => {
    if (!style) return undefined;
    const body = styleToClassDef(style);
    if (!body) return undefined;
    let entry = byKey.get(body);
    if (!entry) {
      entry = { name: `${prefix}${byKey.size}`, body };
      byKey.set(body, entry);
    }
    return entry.name;
  };
  const classDefLines = (): string[] =>
    [...byKey.values()].map((e) => `classDef ${e.name} ${e.body}`);
  return { classNameFor, classDefLines };
}
