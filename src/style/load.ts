import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseStyleSheet, type StyleSheet } from "./style";

let channel: vscode.OutputChannel | undefined;
function log(msg: string): void {
  if (!channel) channel = vscode.window.createOutputChannel("SysML Mermaid");
  channel.appendLine(msg);
}

/** Walk up from `startDir` to filesystem root, returning each directory. */
function ancestors(startDir: string): string[] {
  const out: string[] = [];
  let dir = startDir;
  for (let i = 0; i < 40; i++) {
    out.push(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

/**
 * Load the style sheet referenced by `sysmlMermaid.styleFile`, if set. The path
 * may be absolute, relative to the workspace folder, or relative to any ancestor
 * directory of the source file. Returns undefined if unset; logs diagnostics to
 * the "SysML Mermaid" output channel.
 */
export function loadStyleSheet(sourceUri: vscode.Uri): StyleSheet | undefined {
  const raw = vscode.workspace.getConfiguration("sysmlMermaid").get<string>("styleFile");
  log(`styleFile setting = ${raw === undefined ? "(unset)" : JSON.stringify(raw)}`);
  if (!raw || !raw.trim()) return undefined;

  const candidates: string[] = [];
  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  } else {
    const wsFolder =
      vscode.workspace.getWorkspaceFolder(sourceUri) ?? vscode.workspace.workspaceFolders?.[0];
    if (wsFolder) candidates.push(path.join(wsFolder.uri.fsPath, raw));
    // Also try the path relative to every ancestor of the source file, so it
    // resolves even when no workspace folder is open.
    for (const dir of ancestors(path.dirname(sourceUri.fsPath))) {
      candidates.push(path.join(dir, raw));
    }
  }

  const file = candidates.find((c) => fs.existsSync(c));
  if (!file) {
    log(`style file NOT found. Tried:\n  ${candidates.join("\n  ")}`);
    void vscode.window.showWarningMessage(
      `SysML Mermaid: style file '${raw}' not found (see Output → "SysML Mermaid").`
    );
    return undefined;
  }
  try {
    const sheet = parseStyleSheet(JSON.parse(fs.readFileSync(file, "utf8")));
    log(`loaded style file: ${file} (${sheet.rules.length} rules)`);
    return sheet;
  } catch (e: any) {
    log(`failed to parse ${file}: ${e?.message ?? String(e)}`);
    void vscode.window.showWarningMessage(
      `SysML Mermaid: could not load style file '${raw}': ${e?.message ?? String(e)}`
    );
    return undefined;
  }
}
