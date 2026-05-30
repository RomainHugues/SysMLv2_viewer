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

/**
 * Parse SysML v2 source text into an AST. Uses the in-memory `text` (so unsaved
 * editor edits are respected) keyed by `uriPath`. Validation and the standard
 * library are disabled: we only need the syntactic/containment AST for diagrams.
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
    await services.shared.workspace.DocumentBuilder.build([document], {
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
