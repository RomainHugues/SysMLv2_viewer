import * as vscode from "vscode";
import { randomBytes } from "crypto";

export type RefreshResult =
  | { mermaid: string; theme: string; parseErrors?: number }
  | { error: string };

export interface DiagramPanelOptions {
  title: string;
  /** Mermaid diagram source text. */
  mermaid: string;
  /** Mermaid theme name. */
  theme: string;
  /** Number of parser errors in the source at open time. */
  parseErrors?: number;
  context: vscode.ExtensionContext;
  /** Re-parse the source and rebuild the diagram when the user clicks Refresh. */
  onRefresh: () => Promise<RefreshResult>;
}

export interface ShownPanel {
  panel: vscode.WebviewPanel;
  /** Re-run onRefresh and re-render in place (used by the button and auto-refresh). */
  refresh: () => Promise<void>;
}

/**
 * Open a new webview panel rendering the given Mermaid diagram. Each call creates
 * an independent panel, so several diagrams can be shown side by side. The panel
 * has a Refresh button that re-runs `onRefresh` and re-renders in place; the same
 * `refresh` function is returned so callers can trigger it (e.g. on file save).
 */
export function showDiagramPanel(opts: DiagramPanelOptions): ShownPanel {
  const mediaRoot = vscode.Uri.joinPath(opts.context.extensionUri, "media");
  const panel = vscode.window.createWebviewPanel(
    "sysmlMermaid.diagram",
    opts.title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [mediaRoot],
    }
  );
  panel.webview.html = renderHtml(panel.webview, mediaRoot, opts);

  const refresh = async (): Promise<void> => {
    panel.webview.postMessage({ type: "busy" });
    let result: RefreshResult;
    try {
      result = await opts.onRefresh();
    } catch (e: any) {
      result = { error: e?.message ?? String(e) };
    }
    if ("error" in result) {
      panel.webview.postMessage({ type: "error", message: result.error });
    } else {
      panel.webview.postMessage({
        type: "render",
        definition: result.mermaid,
        theme: result.theme,
        parseErrors: result.parseErrors ?? 0,
      });
    }
  };

  panel.webview.onDidReceiveMessage((msg) => {
    if (msg?.type === "refresh") void refresh();
  });

  return { panel, refresh };
}

function renderHtml(webview: vscode.Webview, mediaRoot: vscode.Uri, opts: DiagramPanelOptions): string {
  const nonce = randomBytes(16).toString("base64");
  const mermaidUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "mermaid.min.js"));
  const csp = [
    `default-src 'none'`,
    `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `img-src ${webview.cspSource} data:`,
    `font-src ${webview.cspSource} data:`,
  ].join("; ");

  // Pass the diagram + theme to the webview as JSON to avoid escaping pitfalls.
  const payload = JSON.stringify({
    definition: opts.mermaid,
    theme: opts.theme,
    parseErrors: opts.parseErrors ?? 0,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #ffffff; color: #1e1e1e; font-family: var(--vscode-font-family); }
    #toolbar { position: sticky; top: 0; display: flex; align-items: center; gap: 10px;
      padding: 6px 12px; background: #f3f3f3; border-bottom: 1px solid #ddd; }
    #toolbar button { font: inherit; padding: 3px 10px; cursor: pointer; }
    #status { color: #666; font-size: 12px; }
    #warning { margin-left: auto; color: #8a6d00; background: #fff4ce; border: 1px solid #e6c77a;
      border-radius: 3px; padding: 2px 8px; font-size: 12px; display: none; }
    #content { padding: 12px; }
    #diagram { width: 100%; overflow: auto; }
    #diagram svg { max-width: 100%; height: auto; }
    .error { color: #b00020; white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace); }
    details { margin-top: 16px; color: #555; }
    pre.src { white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace); background: #f3f3f3; padding: 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="refresh" title="Re-parse the .sysml file and redraw">⟳ Refresh</button>
    <span id="status"></span>
    <span id="warning" title="The file has syntax errors; some elements may be missing from the diagram."></span>
  </div>
  <div id="content">
    <div id="diagram">Rendering…</div>
    <details>
      <summary>Mermaid source</summary>
      <pre class="src" id="src"></pre>
    </details>
  </div>
  <script nonce="${nonce}" src="${mermaidUri}"></script>
  <script nonce="${nonce}">
    (function () {
      const vscode = acquireVsCodeApi();
      const target = document.getElementById("diagram");
      const srcEl = document.getElementById("src");
      const statusEl = document.getElementById("status");
      const warningEl = document.getElementById("warning");
      const refreshBtn = document.getElementById("refresh");
      let seq = 0;

      function showWarning(parseErrors) {
        if (parseErrors > 0) {
          warningEl.textContent = "⚠ " + parseErrors + " syntax error" + (parseErrors > 1 ? "s" : "") + " — diagram may be incomplete";
          warningEl.style.display = "inline";
        } else {
          warningEl.style.display = "none";
        }
      }

      function showError(message) {
        target.innerHTML = '<div class="error"></div>';
        target.firstChild.textContent = message;
      }

      function render(definition, theme) {
        srcEl.textContent = definition;
        const id = "sysmlGraph" + (++seq); // unique id avoids mermaid re-render clashes
        try {
          mermaid.initialize({ startOnLoad: false, theme: theme, securityLevel: "loose" });
          mermaid.render(id, definition)
            .then(function (res) { target.innerHTML = res.svg; })
            .catch(function (err) { showError("Mermaid render error:\\n" + (err && err.message ? err.message : String(err))); });
        } catch (err) {
          showError(String(err));
        }
      }

      function setBusy(busy, text) {
        refreshBtn.disabled = busy;
        statusEl.textContent = text || "";
      }

      refreshBtn.addEventListener("click", function () {
        setBusy(true, "Refreshing…");
        vscode.postMessage({ type: "refresh" });
      });

      window.addEventListener("message", function (event) {
        const msg = event.data;
        if (msg.type === "busy") {
          setBusy(true, "Refreshing…");
        } else if (msg.type === "render") {
          render(msg.definition, msg.theme);
          showWarning(msg.parseErrors || 0);
          setBusy(false, "Updated");
          setTimeout(function () { if (statusEl.textContent === "Updated") statusEl.textContent = ""; }, 1500);
        } else if (msg.type === "error") {
          showError(msg.message);
          setBusy(false, "");
        }
      });

      const initial = ${payload};
      render(initial.definition, initial.theme);
      showWarning(initial.parseErrors || 0);
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}
