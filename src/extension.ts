import * as vscode from "vscode";
import { parseText } from "./sysml/parser";
import { findEnclosingPackage, allPackages } from "./sysml/packageAtCursor";
import { diagramTypes, type DiagramType, type DiagramConfig } from "./diagrams/registry";
import { showDiagramPanel } from "./webview/panel";

export function activate(context: vscode.ExtensionContext): void {
  for (const dt of diagramTypes) {
    context.subscriptions.push(
      vscode.commands.registerCommand(dt.commandId, () => showDiagram(dt, context))
    );
  }
}

async function showDiagram(dt: DiagramType, context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "sysml") {
    vscode.window.showWarningMessage("Open a .sysml file and place the cursor inside a package.");
    return;
  }

  const doc = editor.document;
  try {
    const { document } = await parseText(doc.uri.fsPath, doc.getText());

    const offset = doc.offsetAt(editor.selection.active);
    const pkg = findEnclosingPackage(document, offset) ?? allPackages(document)[0];
    if (!pkg) {
      vscode.window.showWarningMessage("No SysML package found in this file.");
      return;
    }

    const cfg = vscode.workspace.getConfiguration("sysmlMermaid");
    const config: DiagramConfig = {
      direction: cfg.get<DiagramConfig["direction"]>("flowchart.direction", "TB"),
      theme: cfg.get<string>("theme", "default"),
    };

    const mermaid = dt.build(pkg, config);
    const pkgName = pkg.declaredName ?? "package";
    if (!mermaid) {
      vscode.window.showInformationMessage(
        `No elements relevant to the ${dt.label} diagram in package '${pkgName}'.`
      );
      return;
    }

    showDiagramPanel({
      title: `${dt.label}: ${pkgName}`,
      mermaid,
      theme: config.theme,
      context,
    });

    const parseErrors = document.parseResult?.parserErrors?.length ?? 0;
    if (parseErrors > 0) {
      vscode.window.showWarningMessage(
        `The file has ${parseErrors} syntax error(s); the diagram may be incomplete.`
      );
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to render ${dt.label} diagram: ` + (e?.message ?? String(e)));
  }
}

export function deactivate(): void {}
