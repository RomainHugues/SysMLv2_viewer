import * as vscode from "vscode";
import { parseText } from "./sysml/parser";
import { findEnclosingPackage, allPackages, findPackageByQualifiedName } from "./sysml/packageAtCursor";
import { diagramTypes, type DiagramType, type DiagramConfig } from "./diagrams/registry";
import { showDiagramPanel, type RefreshResult } from "./webview/panel";

/** Open diagram panels that can be auto-refreshed when their source file is saved. */
interface OpenDiagram {
  sourceUri: vscode.Uri;
  refresh: () => Promise<void>;
}
const openDiagrams = new Set<OpenDiagram>();

export function activate(context: vscode.ExtensionContext): void {
  for (const dt of diagramTypes) {
    context.subscriptions.push(
      vscode.commands.registerCommand(dt.commandId, () => showDiagram(dt, context))
    );
  }

  // Auto-refresh open diagrams when their .sysml source is saved (if enabled).
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== "sysml") return;
      if (!vscode.workspace.getConfiguration("sysmlMermaid").get<boolean>("autoRefreshOnSave", true)) {
        return;
      }
      for (const d of openDiagrams) {
        if (d.sourceUri.toString() === doc.uri.toString()) void d.refresh();
      }
    })
  );
}

function readConfig(): DiagramConfig {
  const cfg = vscode.workspace.getConfiguration("sysmlMermaid");
  return {
    direction: cfg.get<DiagramConfig["direction"]>("flowchart.direction", "TB"),
    theme: cfg.get<string>("theme", "default"),
  };
}

async function showDiagram(dt: DiagramType, context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "sysml") {
    vscode.window.showWarningMessage("Open a .sysml file and place the cursor inside a package.");
    return;
  }

  const sourceUri = editor.document.uri;
  try {
    const { document } = await parseText(sourceUri.fsPath, editor.document.getText());

    const offset = editor.document.offsetAt(editor.selection.active);
    const pkg = findEnclosingPackage(document, offset) ?? allPackages(document)[0];
    if (!pkg) {
      vscode.window.showWarningMessage("No SysML package found in this file.");
      return;
    }
    const pkgName: string = pkg.declaredName ?? "package";
    const pkgQName: string | undefined = pkg.$meta?.qualifiedName;

    const config = readConfig();
    const mermaid = dt.build(pkg, config);
    if (!mermaid) {
      vscode.window.showInformationMessage(
        `No elements relevant to the ${dt.label} diagram in package '${pkgName}'.`
      );
      return;
    }

    // Re-parse the (possibly edited) source and rebuild the same package's diagram.
    const onRefresh = async (): Promise<RefreshResult> => {
      const doc = await openSource(sourceUri);
      if (!doc) return { error: "Source file is no longer available." };
      const reparsed = (await parseText(sourceUri.fsPath, doc.getText())).document;
      const target =
        (pkgQName && findPackageByQualifiedName(reparsed, pkgQName)) ?? allPackages(reparsed)[0];
      if (!target) return { error: `Package '${pkgName}' was not found in the file.` };
      const cfg = readConfig();
      const out = dt.build(target, cfg);
      if (!out) return { error: `No ${dt.label} elements in package '${pkgName}' anymore.` };
      return { mermaid: out, theme: cfg.theme, parseErrors: parserErrorCount(reparsed) };
    };

    const shown = showDiagramPanel({
      title: `${dt.label}: ${pkgName}`,
      mermaid,
      theme: config.theme,
      parseErrors: parserErrorCount(document),
      context,
      onRefresh,
    });

    // Track this panel for save-triggered auto-refresh; drop it when disposed.
    const entry: OpenDiagram = { sourceUri, refresh: shown.refresh };
    openDiagrams.add(entry);
    shown.panel.onDidDispose(() => openDiagrams.delete(entry));
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to render ${dt.label} diagram: ` + (e?.message ?? String(e)));
  }
}

/** Number of parser errors reported for a parsed document. */
function parserErrorCount(document: any): number {
  return document?.parseResult?.parserErrors?.length ?? 0;
}

/** Get the up-to-date text document for a source URI (open editor copy if any). */
async function openSource(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
  const open = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
  if (open) return open;
  try {
    return await vscode.workspace.openTextDocument(uri);
  } catch {
    return undefined;
  }
}

export function deactivate(): void {}
