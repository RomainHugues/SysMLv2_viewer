// A tabular view: a title, column headers and string rows. Rendered as HTML
// (Mermaid has no tables), so a "table" diagram type emits HTML, not Mermaid.

export interface TableModel {
  title: string;
  headers: string[];
  /** One array of cell strings per row (same length as headers). */
  rows: string[][];
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render a table model as a self-contained HTML <table> (styled via panel CSS). */
export function tableToHtml(model: TableModel): string {
  const head = model.headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = model.rows
    .map((r) => `<tr>${model.headers.map((_, i) => `<td>${esc(r[i] ?? "")}</td>`).join("")}</tr>`)
    .join("\n");
  const count = `${model.rows.length} row${model.rows.length === 1 ? "" : "s"}`;
  return [
    `<table class="celeris-table">`,
    `<caption>${esc(model.title)} <span class="count">(${count})</span></caption>`,
    `<thead><tr>${head}</tr></thead>`,
    `<tbody>`,
    body,
    `</tbody>`,
    `</table>`,
  ].join("\n");
}
