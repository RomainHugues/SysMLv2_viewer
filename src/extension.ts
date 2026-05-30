import * as vscode from "vscode";
import { parseText } from "./sysml/parser";
import { findEnclosingPackage, allPackages } from "./sysml/packageAtCursor";
import { extractFlow } from "./diagrams/flowchart/extract";
import { flowToMermaid, type FlowchartOptions } from "./diagrams/flowchart/mermaid";
import { showDiagramPanel } from "./webview/panel";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("sysmlMermaid.showFlowchart", () => showFlowchart(context))
  );
}

async function showFlowchart(context: vscode.ExtensionContext): Promise<void> {
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

    const model = extractFlow(pkg);
    if (model.groups.length === 0) {
      vscode.window.showInformationMessage(
        `No flow elements (actions) found in package '${pkg.declaredName ?? "package"}'.`
      );
      return;
    }

    const cfg = vscode.workspace.getConfiguration("sysmlMermaid");
    const direction = cfg.get<FlowchartOptions["direction"]>("flowchart.direction", "TB");
    const theme = cfg.get<string>("theme", "default");

    const mermaid = flowToMermaid(model, { direction });
    showDiagramPanel({
      title: `Flowchart: ${pkg.declaredName ?? "package"}`,
      mermaid,
      theme,
      context,
    });

    const parseErrors = document.parseResult?.parserErrors?.length ?? 0;
    if (parseErrors > 0) {
      vscode.window.showWarningMessage(
        `The file has ${parseErrors} syntax error(s); the diagram may be incomplete.`
      );
    }
  } catch (e: any) {
    vscode.window.showErrorMessage("Failed to render flowchart: " + (e?.message ?? String(e)));
  }
}

export function deactivate(): void {}
