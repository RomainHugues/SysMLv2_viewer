import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseStyleSheet, type StyleSheet } from "./style";
import { log } from "../log";

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

function readSheet(file: string): StyleSheet | undefined {
  try {
    const sheet = parseStyleSheet(JSON.parse(fs.readFileSync(file, "utf8")));
    log(`loaded style file: ${file} (${sheet.rules.length} rules)`);
    return sheet;
  } catch (e: any) {
    log(`failed to parse ${file}: ${e?.message ?? String(e)}`);
    void vscode.window.showWarningMessage(
      `Celeris: could not load style file: ${e?.message ?? String(e)}`
    );
    return undefined;
  }
}

/**
 * Resolve the active style sheet. Priority:
 *  1. `explicitPath` (absolute path chosen via the "Select Style File" command,
 *     stored in globalState) — always wins, independent of workspace/settings.
 *  2. `celeris.styleFile` setting (absolute, or relative to the workspace
 *     folder or any ancestor of the source file).
 * Returns undefined when no style is configured. Logs diagnostics.
 */
export function loadStyleSheet(sourceUri: vscode.Uri, explicitPath?: string): StyleSheet | undefined {
  if (explicitPath && explicitPath.trim()) {
    if (fs.existsSync(explicitPath)) {
      log(`style source = selected file: ${explicitPath}`);
      return readSheet(explicitPath);
    }
    log(`selected style file no longer exists: ${explicitPath}`);
  }

  const raw = vscode.workspace.getConfiguration("celeris").get<string>("styleFile");
  log(`styleFile setting = ${raw === undefined || raw === null ? "(unset)" : JSON.stringify(raw)}`);
  if (!raw || !raw.trim()) return undefined;

  const candidates: string[] = [];
  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  } else {
    const wsFolder =
      vscode.workspace.getWorkspaceFolder(sourceUri) ?? vscode.workspace.workspaceFolders?.[0];
    if (wsFolder) candidates.push(path.join(wsFolder.uri.fsPath, raw));
    for (const dir of ancestors(path.dirname(sourceUri.fsPath))) candidates.push(path.join(dir, raw));
  }

  const file = candidates.find((c) => fs.existsSync(c));
  if (!file) {
    log(`style file NOT found. Tried:\n  ${candidates.join("\n  ")}`);
    void vscode.window.showWarningMessage(
      `Celeris: style file '${raw}' not found (see Output → "Celeris").`
    );
    return undefined;
  }
  return readSheet(file);
}
