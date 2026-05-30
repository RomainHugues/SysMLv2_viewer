import { findLeafNodeAtOffset } from "langium";
import type { SysmlNode } from "./parser";

/** AST node from a langium CST node, across langium minor versions. */
function astOf(cst: any): SysmlNode | undefined {
  return cst?.astNode ?? cst?.element;
}

/**
 * Find the SysML `Package` that encloses the given character offset. Returns the
 * innermost enclosing package, or undefined if the cursor is not inside one.
 */
export function findEnclosingPackage(document: any, offset: number): SysmlNode | undefined {
  const root: SysmlNode | undefined = document?.parseResult?.value;
  const rootCst = root?.$cstNode;
  if (!rootCst) return undefined;

  const leaf = findLeafNodeAtOffset(rootCst, offset);
  let node = astOf(leaf);
  while (node) {
    if (node.$type === "Package") return node;
    node = node.$container;
  }
  return undefined;
}

/** Find a package by its qualified name (used to re-locate it after a re-parse). */
export function findPackageByQualifiedName(document: any, qualifiedName: string): SysmlNode | undefined {
  return allPackages(document).find((p) => {
    try {
      return p.$meta?.qualifiedName === qualifiedName;
    } catch {
      return false;
    }
  });
}

/** All packages in document order (fallback when the cursor is not in a package). */
export function allPackages(document: any): SysmlNode[] {
  const root: SysmlNode | undefined = document?.parseResult?.value;
  if (!root) return [];
  const out: SysmlNode[] = [];
  const seen = new Set<SysmlNode>();
  const walk = (node: SysmlNode) => {
    for (const key of Object.keys(node)) {
      if (key.startsWith("$")) continue;
      const value = (node as any)[key];
      const visit = (el: any) => {
        if (!el || typeof el !== "object" || !el.$type || seen.has(el)) return;
        seen.add(el);
        if (el.$type === "Package") out.push(el);
        walk(el);
      };
      if (Array.isArray(value)) value.forEach(visit);
      else visit(value);
    }
  };
  walk(root);
  return out;
}
