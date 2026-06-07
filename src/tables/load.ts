import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseTableConfig, type TableSpec } from "./config";
import { log } from "../log";

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
 * Load user-defined table specs from the `celeris.tableConfig` setting (absolute,
 * or relative to the workspace folder or any ancestor of the source file). Returns
 * [] when unset or on error (the built-in presets still apply). Logs diagnostics.
 */
export function loadTableSpecs(sourceUri: vscode.Uri): TableSpec[] {
  const raw = vscode.workspace.getConfiguration("celeris").get<string>("tableConfig");
  if (!raw || !raw.trim()) return [];

  const candidates: string[] = [];
  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  } else {
    const ws = vscode.workspace.getWorkspaceFolder(sourceUri) ?? vscode.workspace.workspaceFolders?.[0];
    if (ws) candidates.push(path.join(ws.uri.fsPath, raw));
    for (const dir of ancestors(path.dirname(sourceUri.fsPath))) candidates.push(path.join(dir, raw));
  }
  const file = candidates.find((c) => fs.existsSync(c));
  if (!file) {
    log(`table config '${raw}' not found. Tried:\n  ${candidates.join("\n  ")}`);
    void vscode.window.showWarningMessage(`Celeris: table config '${raw}' not found (see Output → "Celeris").`);
    return [];
  }
  try {
    const specs = parseTableConfig(JSON.parse(fs.readFileSync(file, "utf8")));
    log(`loaded table config: ${file} (${specs.length} table(s))`);
    return specs;
  } catch (e: any) {
    log(`failed to parse ${file}: ${e?.message ?? String(e)}`);
    void vscode.window.showWarningMessage(`Celeris: could not load table config: ${e?.message ?? String(e)}`);
    return [];
  }
}
