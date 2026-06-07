import * as vscode from "vscode";
import { parseText } from "./sysml/parser";
import { findEnclosingPackage, allPackages, findPackageByQualifiedName } from "./sysml/packageAtCursor";
import { diagramTypes, type DiagramType, type DiagramConfig } from "./diagrams/registry";
import { showDiagramPanel, type RefreshResult, type ViewOptions } from "./webview/panel";
import { loadStyleSheet } from "./style/load";
import { tableProviders, tableToHtml } from "./tables";
import { loadTableSpecs } from "./tables/load";
import { log, showLog } from "./log";

const STYLE_PATH_KEY = "celeris.selectedStyleFile";

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

  context.subscriptions.push(
    vscode.commands.registerCommand("celeris.showTable", () => showTable(context)),
    vscode.commands.registerCommand("celeris.selectStyleFile", () => selectStyleFile(context)),
    vscode.commands.registerCommand("celeris.clearStyleFile", () => clearStyleFile(context)),
    vscode.commands.registerCommand("celeris.showLog", () => showLog())
  );

  // Auto-refresh open diagrams when their .sysml source is saved (if enabled).
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== "sysml") return;
      if (!vscode.workspace.getConfiguration("celeris").get<boolean>("autoRefreshOnSave", true)) {
        return;
      }
      for (const d of openDiagrams) {
        if (d.sourceUri.toString() === doc.uri.toString()) void d.refresh();
      }
    })
  );
}

function refreshAll(): void {
  for (const d of openDiagrams) void d.refresh();
}

async function selectStyleFile(context: vscode.ExtensionContext): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: "Use as SysML diagram style",
    filters: { "Style files": ["json"] },
  });
  if (!picked || picked.length === 0) return;
  const fsPath = picked[0].fsPath;
  await context.globalState.update(STYLE_PATH_KEY, fsPath);
  log(`selected style file set to: ${fsPath}`);
  vscode.window.showInformationMessage(`Celeris style: ${fsPath}`);
  refreshAll();
}

async function clearStyleFile(context: vscode.ExtensionContext): Promise<void> {
  await context.globalState.update(STYLE_PATH_KEY, undefined);
  log("selected style file cleared");
  vscode.window.showInformationMessage("Celeris: style cleared.");
  refreshAll();
}

function readConfig(sourceUri: vscode.Uri, context: vscode.ExtensionContext): DiagramConfig {
  const cfg = vscode.workspace.getConfiguration("celeris");
  const selected = context.globalState.get<string>(STYLE_PATH_KEY);
  return {
    direction: cfg.get<DiagramConfig["direction"]>("flowchart.direction", "TB"),
    theme: cfg.get<string>("theme", "default"),
    styleSheet: loadStyleSheet(sourceUri, selected),
  };
}

/** Count Mermaid styling directives in the output (for diagnostics). */
function countStyleDirectives(mermaid: string): number {
  return (mermaid.match(/(^|\n)\s*(style |classDef |class .+:::| {2}box )/g) ?? []).length;
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

    const config = readConfig(sourceUri, context);
    const mermaid = dt.build(pkg, config);
    if (!mermaid) {
      vscode.window.showInformationMessage(
        `No elements relevant to the ${dt.label} diagram in package '${pkgName}'.`
      );
      return;
    }
    log(`${dt.label} '${pkgName}': style sheet ${config.styleSheet ? "active" : "none"}, ${countStyleDirectives(mermaid)} style directive(s) in output`);

    // Re-parse the (possibly edited) source and rebuild the same package's diagram,
    // applying the panel's current view toggles (hide definitions / inherited types).
    const onRefresh = async (view?: ViewOptions): Promise<RefreshResult> => {
      const doc = await openSource(sourceUri);
      if (!doc) return { error: "Source file is no longer available." };
      const reparsed = (await parseText(sourceUri.fsPath, doc.getText())).document;
      const target =
        (pkgQName && findPackageByQualifiedName(reparsed, pkgQName)) ?? allPackages(reparsed)[0];
      if (!target) return { error: `Package '${pkgName}' was not found in the file.` };
      const cfg = { ...readConfig(sourceUri, context), ...(view ?? {}) };
      const out = dt.build(target, cfg);
      if (!out) return { error: `No ${dt.label} elements in package '${pkgName}' anymore.` };
      log(`refresh ${dt.label} '${pkgName}': style ${cfg.styleSheet ? "active" : "none"}, ${countStyleDirectives(out)} style directive(s)`);
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

/** Show a tabular view: pick a table (preset or configured) and render it as HTML. */
async function showTable(context: vscode.ExtensionContext): Promise<void> {
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

    const providers = tableProviders(loadTableSpecs(sourceUri));
    const pick = await vscode.window.showQuickPick(
      providers.map((p) => ({ label: p.title, description: p.custom ? "custom" : "preset", id: p.id })),
      { placeHolder: `Select a table to show for package '${pkgName}'` }
    );
    if (!pick) return;
    const provider = providers.find((p) => p.id === (pick as { id: string }).id)!;
    const html = tableToHtml(provider.build(pkg));
    log(`table '${provider.title}' for package '${pkgName}'`);

    const onRefresh = async (): Promise<RefreshResult> => {
      const doc = await openSource(sourceUri);
      if (!doc) return { error: "Source file is no longer available." };
      const reparsed = (await parseText(sourceUri.fsPath, doc.getText())).document;
      const target =
        (pkgQName && findPackageByQualifiedName(reparsed, pkgQName)) ?? allPackages(reparsed)[0];
      if (!target) return { error: `Package '${pkgName}' was not found in the file.` };
      const prov = tableProviders(loadTableSpecs(sourceUri)).find((p) => p.id === provider.id);
      if (!prov) return { error: `Table '${provider.title}' is no longer defined.` };
      return { mermaid: tableToHtml(prov.build(target)), theme: "default", parseErrors: parserErrorCount(reparsed) };
    };

    const shown = showDiagramPanel({
      title: `${provider.title}: ${pkgName}`,
      mermaid: html,
      theme: "default",
      parseErrors: parserErrorCount(document),
      format: "html",
      context,
      onRefresh,
    });
    const entry: OpenDiagram = { sourceUri, refresh: shown.refresh };
    openDiagrams.add(entry);
    shown.panel.onDidDispose(() => openDiagrams.delete(entry));
  } catch (e: any) {
    vscode.window.showErrorMessage("Failed to show table: " + (e?.message ?? String(e)));
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
