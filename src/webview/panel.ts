import * as vscode from "vscode";
import { randomBytes } from "crypto";

export type RefreshResult =
  | { mermaid: string; theme: string; parseErrors?: number }
  | { error: string };

/** Per-panel view toggles, sent from the toolbar buttons and reused on every refresh. */
export interface ViewOptions {
  hideDefinitions?: boolean;
  hideInheritance?: boolean;
}

export interface DiagramPanelOptions {
  title: string;
  /** Diagram content: Mermaid text, or an HTML fragment when format is "html". */
  mermaid: string;
  /** Mermaid theme name. */
  theme: string;
  /** Number of parser errors in the source at open time. */
  parseErrors?: number;
  /** "mermaid" (default) renders via Mermaid; "html" injects content (table); "svg" injects raw SVG. */
  format?: "mermaid" | "html" | "svg";
  context: vscode.ExtensionContext;
  /** Re-parse the source and rebuild the diagram, honouring the current view toggles. */
  onRefresh: (view?: ViewOptions) => Promise<RefreshResult>;
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
    "celeris.diagram",
    opts.title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [mediaRoot],
    }
  );
  panel.webview.html = renderHtml(panel.webview, mediaRoot, opts);

  // Remember the latest view toggles so save-triggered refreshes keep them.
  let lastView: ViewOptions | undefined;
  const refresh = async (view?: ViewOptions): Promise<void> => {
    if (view) lastView = view;
    panel.webview.postMessage({ type: "busy" });
    let result: RefreshResult;
    try {
      result = await opts.onRefresh(lastView);
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
    if (msg?.type === "refresh") void refresh(msg.view as ViewOptions | undefined);
    else if (msg?.type === "export") void savePng(msg.dataUrl, opts.title);
    else if (msg?.type === "exportCsv") void saveCsv(msg.csv, opts.title);
  });

  return { panel, refresh };
}

/** Decode a data: URL PNG and save it via a Save dialog. */
async function savePng(dataUrl: string, title: string): Promise<void> {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl ?? "");
  if (!m) {
    void vscode.window.showErrorMessage("PNG export failed: invalid image data.");
    return;
  }
  const bytes = Buffer.from(m[1], "base64");
  const fileName = title.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "diagram";

  const folders = vscode.workspace.workspaceFolders;
  const defaultDir = folders && folders.length > 0 ? folders[0].uri : vscode.Uri.file(fileName);
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(defaultDir, `${fileName}.png`),
    filters: { Images: ["png"] },
    saveLabel: "Export PNG",
  });
  if (!target) return; // cancelled

  try {
    await vscode.workspace.fs.writeFile(target, bytes);
    const open = await vscode.window.showInformationMessage(
      `Diagram exported to ${target.fsPath}`,
      "Open"
    );
    if (open === "Open") void vscode.commands.executeCommand("vscode.open", target);
  } catch (e: any) {
    void vscode.window.showErrorMessage("Could not save PNG: " + (e?.message ?? String(e)));
  }
}

/** Save a table view's CSV text via a Save dialog. */
async function saveCsv(csv: string, title: string): Promise<void> {
  const fileName = title.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "table";
  const folders = vscode.workspace.workspaceFolders;
  const defaultDir = folders && folders.length > 0 ? folders[0].uri : vscode.Uri.file(fileName);
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(defaultDir, `${fileName}.csv`),
    filters: { "CSV files": ["csv"] },
    saveLabel: "Export CSV",
  });
  if (!target) return;
  try {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]); // UTF-8 BOM so Excel reads accents correctly
    await vscode.workspace.fs.writeFile(target, Buffer.concat([bom, Buffer.from(csv ?? "", "utf8")]));
    const open = await vscode.window.showInformationMessage(`Table exported to ${target.fsPath}`, "Open");
    if (open === "Open") void vscode.commands.executeCommand("vscode.open", target);
  } catch (e: any) {
    void vscode.window.showErrorMessage("Could not save CSV: " + (e?.message ?? String(e)));
  }
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

  const format = opts.format ?? "mermaid";
  // Pass the diagram + theme to the webview as JSON to avoid escaping pitfalls.
  const payload = JSON.stringify({
    definition: opts.mermaid,
    theme: opts.theme,
    parseErrors: opts.parseErrors ?? 0,
    format,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    html, body { height: 100%; }
    body { margin: 0; background: #ffffff; color: #1e1e1e; font-family: var(--vscode-font-family);
      display: flex; flex-direction: column; }
    #toolbar { flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; background: #f3f3f3; border-bottom: 1px solid #ddd; }
    #toolbar button { font: inherit; padding: 3px 9px; cursor: pointer; }
    #toolbar button.toggle.active { background: #cfe3ff; border-color: #6aa3e0; font-weight: 600; }
    #toolbar .sep { width: 1px; align-self: stretch; background: #ddd; }
    #zoom { color: #666; font-size: 12px; min-width: 44px; text-align: center; }
    #status { color: #666; font-size: 12px; }
    #warning { margin-left: auto; color: #8a6d00; background: #fff4ce; border: 1px solid #e6c77a;
      border-radius: 3px; padding: 2px 8px; font-size: 12px; display: none; }
    #viewport { flex: 1 1 auto; position: relative; overflow: hidden; background: #fff; cursor: grab; }
    #viewport.panning { cursor: grabbing; }
    #canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; }
    #canvas svg { display: block; }
    table.celeris-table { border-collapse: collapse; background: #fff; font-size: 13px; }
    table.celeris-table caption { text-align: left; font-weight: 600; padding: 4px 2px 8px; font-size: 14px; }
    table.celeris-table caption .count { color: #888; font-weight: 400; font-size: 12px; }
    table.celeris-table th, table.celeris-table td { border: 1px solid #cbd2da; padding: 4px 10px;
      text-align: left; vertical-align: top; max-width: 460px; }
    table.celeris-table thead th { background: #eef2f7; position: sticky; top: 0; }
    table.celeris-table tbody tr:nth-child(even) { background: #f7f9fc; }
    table.celeris-table tbody tr:hover { background: #eaf2ff; }
    .error { color: #b00020; white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace); padding: 12px; }
    #footer { flex: 0 0 auto; border-top: 1px solid #ddd; max-height: 28vh; overflow: auto; }
    #footer details { margin: 0; color: #555; }
    #footer summary { padding: 6px 12px; cursor: pointer; user-select: none; }
    pre.src { white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace);
      background: #f6f8fc; margin: 0; padding: 8px 12px; font-size: 11px; }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="refresh" title="Re-parse the .sysml file and redraw">⟳ Refresh</button>
    <button id="export" title="Export the diagram as a PNG image">⤓ PNG</button>
    <span class="sep"></span>
    <button id="zoomout" title="Zoom out">−</button>
    <button id="zoom100" title="Actual size (1:1)">1:1</button>
    <button id="zoomin" title="Zoom in">+</button>
    <button id="fit" title="Fit to window (auto)">⤢ Fit</button>
    <span id="zoom">100%</span>
    <span class="sep" id="toggleSep"></span>
    <button id="toggleDefs" class="toggle" title="Hide/show definition boxes (class &amp; requirement views)">Defs</button>
    <button id="toggleInh" class="toggle" title="Hide/show inherited types — inheritance edges &amp; supertypes (class &amp; requirement views)">Inherited</button>
    <span id="status"></span>
    <span id="warning" title="The file has syntax errors; some elements may be missing from the diagram."></span>
  </div>
  <div id="viewport"><div id="canvas">Rendering…</div></div>
  <div id="footer">
    <details>
      <summary>Source</summary>
      <pre class="src" id="src"></pre>
    </details>
  </div>
  ${format !== "svg" ? `<script nonce="${nonce}" src="${mermaidUri}"></script>` : "<!-- mermaid not loaded for svg format -->"}
  <script nonce="${nonce}">
    (function () {
      const vscode = acquireVsCodeApi();
      const viewport = document.getElementById("viewport");
      const canvas = document.getElementById("canvas");
      const srcEl = document.getElementById("src");
      const statusEl = document.getElementById("status");
      const zoomEl = document.getElementById("zoom");
      const warningEl = document.getElementById("warning");
      const refreshBtn = document.getElementById("refresh");
      const exportBtn = document.getElementById("export");
      const toggleDefsBtn = document.getElementById("toggleDefs");
      const toggleInhBtn = document.getElementById("toggleInh");
      // Per-panel view toggles, persisted via webview state so they survive an
      // iframe reload (e.g. "Developer: Reload Webviews") and stay the source of truth.
      const persistedView = vscode.getState() || {};
      let hideDefs = !!persistedView.hideDefinitions, hideInh = !!persistedView.hideInheritance;
      const VIEW_FORMAT = ${JSON.stringify(format)}; // "mermaid" | "html" (table view)
      let seq = 0;
      let lastSvg = null;
      let lastTable = null; // the rendered <table> element for an html (table) view

      // --- pan / zoom state ---
      let scale = 1, tx = 0, ty = 0, natW = 0, natH = 0;
      function applyTransform() {
        canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
        zoomEl.textContent = Math.round(scale * 100) + "%";
      }
      function fit() {
        if (!natW || !natH) return;
        const vw = viewport.clientWidth, vh = viewport.clientHeight;
        const s = Math.min(vw / natW, vh / natH) * 0.98;
        scale = s > 0 && isFinite(s) ? s : 1;
        tx = (vw - natW * scale) / 2;
        ty = (vh - natH * scale) / 2;
        applyTransform();
      }
      function actualSize() {
        const vw = viewport.clientWidth, vh = viewport.clientHeight;
        scale = 1;
        tx = Math.max(0, (vw - natW) / 2);
        ty = Math.max(0, (vh - natH) / 2);
        applyTransform();
      }
      function zoomAt(factor, cx, cy) {
        const ns = Math.min(20, Math.max(0.05, scale * factor));
        const wx = (cx - tx) / scale, wy = (cy - ty) / scale;
        scale = ns; tx = cx - wx * ns; ty = cy - wy * ns;
        applyTransform();
      }
      function centerZoom(factor) {
        const r = viewport.getBoundingClientRect();
        zoomAt(factor, r.width / 2, r.height / 2);
      }

      function showWarning(parseErrors) {
        if (parseErrors > 0) {
          warningEl.textContent = "⚠ " + parseErrors + " syntax error" + (parseErrors > 1 ? "s" : "") + " — diagram may be incomplete";
          warningEl.style.display = "inline";
        } else {
          warningEl.style.display = "none";
        }
      }

      function showError(message) {
        lastSvg = null; lastTable = null; exportBtn.disabled = true;
        canvas.style.transform = "none";
        canvas.innerHTML = '<div class="error"></div>';
        canvas.firstChild.textContent = message;
      }

      // Table (html) views: inject the HTML and size the canvas to the table.
      function renderTable(html) {
        lastSvg = null;
        canvas.innerHTML = html;
        lastTable = canvas.querySelector("table");
        exportBtn.disabled = !lastTable;
        const el = lastTable || canvas.firstElementChild;
        natW = (el && (el.scrollWidth || el.offsetWidth)) || 800;
        natH = (el && (el.scrollHeight || el.offsetHeight)) || 400;
        fit();
      }

      // Gantt views carry a base64 colour map in a trailing %% comment (Mermaid
      // ignores it). Recolour each task bar by resource and outline the critical path.
      function applyGanttColors(svg, definition) {
        const m = /%% celeris-gantt:([A-Za-z0-9+/=]+)/.exec(definition);
        if (!m) return;
        let map;
        try { map = JSON.parse(atob(m[1])); } catch (e) { return; }
        const rects = svg.querySelectorAll("rect.task");
        for (let i = 0; i < rects.length; i++) {
          const id = rects[i].id || "";
          const tid = id.indexOf("-") >= 0 ? id.slice(id.lastIndexOf("-") + 1) : id; // task id is the last "-" segment
          const e = map[tid];
          if (!e) continue;
          rects[i].style.fill = e.f;
          rects[i].style.fillOpacity = "1";
          if (e.c) { rects[i].style.stroke = "#d00000"; rects[i].style.strokeWidth = "3px"; }
        }
      }

      // Raw SVG format: inject the SVG directly and reuse the same pan/zoom/export path.
      function renderSvg(svgText) {
        lastTable = null;
        canvas.innerHTML = svgText;
        lastSvg = canvas.querySelector("svg");
        exportBtn.disabled = !lastSvg;
        if (lastSvg) {
          const vb = lastSvg.viewBox && lastSvg.viewBox.baseVal;
          natW = (vb && vb.width) || lastSvg.width.baseVal.value || 600;
          natH = (vb && vb.height) || lastSvg.height.baseVal.value || 400;
          lastSvg.style.maxWidth = "none";
          fit();
        }
      }

      function render(definition, theme) {
        srcEl.textContent = definition;
        if (VIEW_FORMAT === "html") { renderTable(definition); return; }
        if (VIEW_FORMAT === "svg") { renderSvg(definition); return; }
        const id = "sysmlGraph" + (++seq); // unique id avoids mermaid re-render clashes
        try {
          // htmlLabels:false keeps labels as SVG <text> (no <foreignObject>), so the
          // canvas isn't tainted and PNG export via toDataURL works.
          mermaid.initialize({
            startOnLoad: false,
            theme: theme,
            securityLevel: "loose",
            flowchart: { htmlLabels: false },
            class: { htmlLabels: false },
          });
          mermaid.render(id, definition)
            .then(function (res) {
              canvas.innerHTML = res.svg;
              lastSvg = canvas.querySelector("svg");
              exportBtn.disabled = !lastSvg;
              if (lastSvg) applyGanttColors(lastSvg, definition);
              if (lastSvg) {
                const vb = lastSvg.viewBox && lastSvg.viewBox.baseVal;
                const bb = lastSvg.getBBox ? lastSvg.getBBox() : null;
                natW = (vb && vb.width) || (bb && bb.width) || 600;
                natH = (vb && vb.height) || (bb && bb.height) || 400;
                lastSvg.style.maxWidth = "none";
                lastSvg.setAttribute("width", natW);
                lastSvg.setAttribute("height", natH);
                fit(); // auto-fit each fresh render
              }
            })
            .catch(function (err) {
              showError("Mermaid render error:\\n" + (err && err.message ? err.message : String(err)));
            });
        } catch (err) {
          showError(String(err));
        }
      }

      // Rasterize the rendered SVG to PNG bytes and hand them to the extension to save.
      function exportPng() {
        if (!lastSvg) return;
        try {
          const svg = lastSvg.cloneNode(true);
          const rect = lastSvg.getBoundingClientRect();
          const bbox = lastSvg.getBBox ? lastSvg.getBBox() : { width: rect.width, height: rect.height };
          const w = Math.ceil((bbox.width || rect.width) + 20);
          const h = Math.ceil((bbox.height || rect.height) + 20);
          svg.setAttribute("width", w);
          svg.setAttribute("height", h);
          const scale = 2; // 2x for a crisp image
          const data = new XMLSerializer().serializeToString(svg);
          const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/png");
            vscode.postMessage({ type: "export", dataUrl: dataUrl });
            setBusy(false, "Exported");
            setTimeout(function () { if (statusEl.textContent === "Exported") statusEl.textContent = ""; }, 1500);
          };
          img.onerror = function () { setBusy(false, ""); showError("Could not rasterize the diagram for export."); };
          img.src = url;
        } catch (err) {
          setBusy(false, "");
          showError("PNG export failed:\\n" + String(err));
        }
      }

      // Build CSV from the rendered table DOM and hand it to the extension to save.
      function exportCsv() {
        if (!lastTable) { setBusy(false, ""); return; }
        const lines = [];
        const trs = lastTable.querySelectorAll("tr");
        for (let i = 0; i < trs.length; i++) {
          const cells = trs[i].querySelectorAll("th,td");
          const out = [];
          for (let j = 0; j < cells.length; j++) {
            let v = cells[j].textContent || "";
            if (/^[=+@-]/.test(v)) v = "'" + v; // neutralize spreadsheet formula injection
            out.push('"' + v.replace(/"/g, '""') + '"');
          }
          if (out.length) lines.push(out.join(","));
        }
        vscode.postMessage({ type: "exportCsv", csv: lines.join("\\r\\n") });
        setBusy(false, "Exported");
        setTimeout(function () { if (statusEl.textContent === "Exported") statusEl.textContent = ""; }, 1500);
      }

      function setBusy(busy, text) {
        refreshBtn.disabled = busy;
        exportBtn.disabled = busy || (!lastSvg && !lastTable);
        toggleDefsBtn.disabled = busy; // avoid concurrent refreshes from rapid toggling
        toggleInhBtn.disabled = busy;
        statusEl.textContent = text || "";
      }

      function sendRefresh() {
        vscode.setState({ hideDefinitions: hideDefs, hideInheritance: hideInh });
        setBusy(true, "Refreshing…");
        vscode.postMessage({ type: "refresh", view: { hideDefinitions: hideDefs, hideInheritance: hideInh } });
      }

      refreshBtn.addEventListener("click", sendRefresh);

      exportBtn.addEventListener("click", function () {
        setBusy(true, "Exporting…");
        if (VIEW_FORMAT === "html") exportCsv(); else exportPng();
      });

      // View filter toggles (effective on class & requirement diagrams).
      toggleDefsBtn.addEventListener("click", function () {
        hideDefs = !hideDefs;
        toggleDefsBtn.classList.toggle("active", hideDefs);
        sendRefresh();
      });
      toggleInhBtn.addEventListener("click", function () {
        hideInh = !hideInh;
        toggleInhBtn.classList.toggle("active", hideInh);
        sendRefresh();
      });

      // --- zoom / pan controls ---
      document.getElementById("zoomin").addEventListener("click", function () { centerZoom(1.2); });
      document.getElementById("zoomout").addEventListener("click", function () { centerZoom(1 / 1.2); });
      document.getElementById("zoom100").addEventListener("click", actualSize);
      document.getElementById("fit").addEventListener("click", fit);

      viewport.addEventListener("wheel", function (e) {
        if (!lastSvg && !lastTable) return;
        e.preventDefault();
        const r = viewport.getBoundingClientRect();
        zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });

      let dragging = false, lastX = 0, lastY = 0;
      viewport.addEventListener("mousedown", function (e) {
        if (!lastSvg && !lastTable) return;
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        viewport.classList.add("panning");
      });
      window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        tx += e.clientX - lastX; ty += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        applyTransform();
      });
      window.addEventListener("mouseup", function () {
        dragging = false; viewport.classList.remove("panning");
      });
      // keyboard: +/- zoom, 0 = 1:1, f = fit
      window.addEventListener("keydown", function (e) {
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
        if (e.key === "+" || e.key === "=") centerZoom(1.2);
        else if (e.key === "-") centerZoom(1 / 1.2);
        else if (e.key === "0") actualSize();
        else if (e.key === "f" || e.key === "F") fit();
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

      // Table views export CSV and have no diagram-only toggles.
      if (VIEW_FORMAT === "html") {
        exportBtn.textContent = "⤓ CSV";
        exportBtn.title = "Export the table as CSV";
        toggleDefsBtn.style.display = "none";
        toggleInhBtn.style.display = "none";
        document.getElementById("toggleSep").style.display = "none";
      }
      // SVG views share the PNG export path; no mermaid engine loaded.
      if (VIEW_FORMAT === "svg") {
        toggleDefsBtn.style.display = "none";
        toggleInhBtn.style.display = "none";
        document.getElementById("toggleSep").style.display = "none";
      }

      // Reflect any restored toggle state on the buttons.
      toggleDefsBtn.classList.toggle("active", hideDefs);
      toggleInhBtn.classList.toggle("active", hideInh);

      const initial = ${payload};
      render(initial.definition, initial.theme);
      showWarning(initial.parseErrors || 0);
      // The embedded payload is the unfiltered open-time diagram; if a filter was
      // restored (iframe reload), re-request so the view matches the active buttons.
      if (hideDefs || hideInh) sendRefresh();
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
