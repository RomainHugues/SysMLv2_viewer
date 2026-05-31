import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

/** Shared "SysML Mermaid" output channel for diagnostics. */
export function log(message: string): void {
  if (!channel) channel = vscode.window.createOutputChannel("SysML Mermaid");
  channel.appendLine(message);
}

export function showLog(): void {
  if (!channel) channel = vscode.window.createOutputChannel("SysML Mermaid");
  channel.show(true);
}
