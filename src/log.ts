import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

/** Shared "Celeris" output channel for diagnostics. */
export function log(message: string): void {
  if (!channel) channel = vscode.window.createOutputChannel("Celeris");
  channel.appendLine(message);
}

export function showLog(): void {
  if (!channel) channel = vscode.window.createOutputChannel("Celeris");
  channel.show(true);
}
