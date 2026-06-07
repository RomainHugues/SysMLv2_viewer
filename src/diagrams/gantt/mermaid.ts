import type { GanttModel } from "./ir";

// Sanitize a label for a Mermaid gantt section/task (':' delimits task metadata).
function esc(s: string): string {
  return s.replace(/[:#\r\n]+/g, " ").replace(/\s+/g, " ").trim() || "(unnamed)";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Project-relative day offset -> a YYYY-MM-DD date from a fixed base (2024-01-01). */
function dayDate(offset: number): string {
  const d = new Date(Date.UTC(2024, 0, 1));
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(offset)));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Render a Gantt model as Mermaid `gantt` text. Tasks are placed at their computed
 * earliest start (so dependencies are reflected in the timing) and grouped into a
 * section per resource. A trailing `%%` comment carries the per-task colour/critical
 * map (Mermaid ignores it; the webview reads it to recolour bars and outline the
 * critical path).
 */
export function ganttToMermaid(model: GanttModel): string {
  const lines = ["gantt", "  dateFormat YYYY-MM-DD", "  axisFormat %d %b", "  title Activity schedule"];

  const order: string[] = [];
  const seen = new Set<string>();
  for (const t of model.tasks) {
    if (!seen.has(t.resource)) {
      seen.add(t.resource);
      order.push(t.resource);
    }
  }

  for (const res of order) {
    lines.push(`  section ${esc(res || "Unassigned")}`);
    const group = model.tasks.filter((t) => t.resource === res).sort((a, b) => a.start - b.start);
    for (const t of group) {
      const dur = Math.max(1, Math.round(t.duration));
      lines.push(`  ${esc(t.name)} :${t.id}, ${dayDate(t.start)}, ${dur}d`);
    }
  }

  const colors: Record<string, { f: string; c: number }> = {};
  for (const t of model.tasks) {
    colors[t.id] = { f: model.resourceColors[t.resource] ?? model.resourceColors[""], c: t.critical ? 1 : 0 };
  }
  lines.push(`%% celeris-gantt:${Buffer.from(JSON.stringify(colors), "utf8").toString("base64")}`);
  return lines.join("\n");
}
