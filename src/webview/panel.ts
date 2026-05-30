import * as vscode from "vscode";
import { randomBytes } from "crypto";

export interface DiagramPanelOptions {
  title: string;
  /** Mermaid diagram source text. */
  mermaid: string;
  /** Mermaid theme name. */
  theme: string;
  context: vscode.ExtensionContext;
}

/**
 * Open a new webview panel rendering the given Mermaid diagram. Each call creates
 * an independent panel, so several diagrams can be shown side by side.
 */
export function showDiagramPanel(opts: DiagramPanelOptions): vscode.WebviewPanel {
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
  return panel;
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
  const payload = JSON.stringify({ definition: opts.mermaid, theme: opts.theme });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    body { margin: 0; padding: 12px; background: #ffffff; color: #1e1e1e; font-family: var(--vscode-font-family); }
    #diagram { width: 100%; overflow: auto; }
    #diagram svg { max-width: 100%; height: auto; }
    .error { color: #b00020; white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace); }
    details { margin-top: 16px; color: #555; }
    pre.src { white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace); background: #f3f3f3; padding: 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div id="diagram">Rendering…</div>
  <details>
    <summary>Mermaid source</summary>
    <pre class="src" id="src"></pre>
  </details>
  <script nonce="${nonce}" src="${mermaidUri}"></script>
  <script nonce="${nonce}">
    (function () {
      const { definition, theme } = ${payload};
      document.getElementById("src").textContent = definition;
      const target = document.getElementById("diagram");
      try {
        mermaid.initialize({ startOnLoad: false, theme: theme, securityLevel: "loose" });
        mermaid.render("sysmlGraph", definition)
          .then(function (res) { target.innerHTML = res.svg; })
          .catch(function (err) {
            target.innerHTML = '<div class="error"></div>';
            target.firstChild.textContent = "Mermaid render error:\\n" + (err && err.message ? err.message : String(err));
          });
      } catch (err) {
        target.innerHTML = '<div class="error"></div>';
        target.firstChild.textContent = String(err);
      }
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
