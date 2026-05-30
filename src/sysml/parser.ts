import * as fs from "fs";
import * as path from "path";
import { URI } from "vscode-uri";
import { createSysMLServices } from "syside-languageserver";
import { SysMLNodeFileSystem } from "syside-languageserver/node";

/** A syside-languageserver AST node. Loosely typed at this boundary. */
export type SysmlNode = any;

export interface ParsedDocument {
  /** Root AST node (an `ast.Namespace`). */
  root: SysmlNode;
  /** The underlying LangiumDocument (has `.parseResult`, `.textDocument`, CST). */
  document: any;
  /** The SysML language services. */
  services: any;
}

let servicesSingleton: any;

function sysmlServices(): any {
  if (!servicesSingleton) {
    servicesSingleton = createSysMLServices(SysMLNodeFileSystem).SysML;
  }
  return servicesSingleton;
}

/** Find sibling `.sysml`/`.kerml` files (same directory tree) for import resolution. */
function siblingSysmlFiles(currentPath: string, maxFiles = 200): string[] {
  const dir = path.dirname(currentPath);
  const out: string[] = [];
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= maxFiles) return;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        walk(full);
      } else if (/\.(sysml|kerml)$/i.test(e.name) && path.resolve(full) !== path.resolve(currentPath)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * Parse SysML v2 source text into an AST. Uses the in-memory `text` (so unsaved
 * editor edits are respected) keyed by `uriPath`. Sibling `.sysml`/`.kerml` files
 * are also loaded from disk so imports of reusable profile libraries resolve.
 * Validation and the standard library are disabled: we only need the
 * syntactic/containment AST for diagrams.
 */
export async function parseText(uriPath: string, text: string): Promise<ParsedDocument> {
  const services = sysmlServices();
  const uri = URI.file(uriPath);
  const docs = services.shared.workspace.LangiumDocuments;

  // Drop any previously-built document for this URI so re-parsing reflects edits.
  if (docs.hasDocument(uri)) {
    docs.deleteDocument(uri);
  }

  // The parser/builder log build statistics via console.log/info/debug
  // (config.logStatistics). Silence them for the duration of the build.
  const saved = { log: console.log, info: console.info, debug: console.debug };
  console.log = console.info = console.debug = () => {};
  try {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    docs.addDocument(document);

    // Load sibling files (from disk) so profile-library imports can resolve.
    // The current file always uses the live editor text above.
    const toBuild = [document];
    for (const sib of siblingSysmlFiles(uriPath)) {
      const sibUri = URI.file(sib);
      if (docs.hasDocument(sibUri)) docs.deleteDocument(sibUri);
      try {
        const content = fs.readFileSync(sib, "utf8");
        const sibDoc = services.shared.workspace.LangiumDocumentFactory.fromString(content, sibUri);
        docs.addDocument(sibDoc);
        toBuild.push(sibDoc);
      } catch {
        /* ignore unreadable siblings */
      }
    }

    await services.shared.workspace.DocumentBuilder.build(toBuild, {
      validationChecks: "none",
      standardLibrary: "none",
    });
    return { root: document.parseResult.value, document, services };
  } finally {
    console.log = saved.log;
    console.info = saved.info;
    console.debug = saved.debug;
  }
}
