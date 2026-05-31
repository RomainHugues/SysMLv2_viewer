# Celeris

**SysMLv2 Mermaid Viewer** — a VS Code extension that renders the contents of a
**SysML v2 package** as a **Mermaid** diagram. Put your cursor inside a package in a `.sysml` file,
right-click, and pick a diagram type — the package is shown in a webview panel,
with irrelevant elements filtered out. Several diagrams can be open at once
(one per panel).

Diagram types: **flowchart**, **class**, **state**, **sequence** and
**requirement** (all implemented). See [examples/](examples/README.md) for a
sample model per type.

## How it works

- **Parsing** reuses the open-source SysML v2 parser
  [`syside-languageserver`](https://github.com/sensmetry/sysml-2ls) (Langium,
  EPL-2.0 / GPL-2.0 with Classpath exception) **in-process** for a full semantic
  AST. The installed Syside Editor still provides editor linting; this extension
  uses the open-source parser only to build diagrams.
- **Extraction** walks the package AST into a small diagram IR
  (`src/diagrams/ir.ts`), keeping only relevant elements (e.g. for flowcharts:
  actions, decisions, forks/joins and successions/transitions).
- **Rendering** turns the IR into Mermaid text and shows it in a webview that
  loads a bundled, offline copy of Mermaid.

```
.sysml ──▶ parseText ──▶ findEnclosingPackage ──▶ extractFlow ──▶ flowToMermaid ──▶ webview
          (parser.ts)     (packageAtCursor.ts)    (flowchart/)     (flowchart/)      (panel.ts)
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/extension.ts` | Activation + command handler |
| `src/sysml/parser.ts` | In-process SysML parsing (anti-corruption boundary) |
| `src/sysml/packageAtCursor.ts` | Cursor offset → enclosing package |
| `src/diagrams/ir.ts` | Diagram intermediate representation |
| `src/diagrams/flowchart/extract.ts` | Package AST → flow IR |
| `src/diagrams/flowchart/mermaid.ts` | Flow IR → Mermaid text |
| `src/webview/panel.ts` | Webview panel + Mermaid rendering |
| `scripts/*.mjs` | Headless checks (parser, render, cursor) |
| `examples/coffee.sysml` | Sample model |

## Development setup

1. **Node.js** (installed: v24 LTS) and the build toolchain:
   ```bash
   npm install
   ```
2. **The SysML parser** is built at *build time* from a sibling clone of
   `sensmetry/sysml-2ls`, expected at `../_sysml-2ls-src`. It is bundled into
   `dist/extension.js` by esbuild, so the runtime artifact is self-contained.
   To (re)create it:
   ```bash
   git -c http.sslBackend=schannel clone --depth 1 \
     https://github.com/sensmetry/sysml-2ls ../_sysml-2ls-src
   cd ../_sysml-2ls-src && pnpm install --filter "syside-languageserver..."
   ```
   Override the location with the `SYSIDE_DIR` environment variable.
3. **Build / test:**
   ```bash
   npm run build          # bundle the extension + copy Mermaid into media/
   npm test                          # unit + integration tests
   npm run check-parser              # parse a sample with the bundled parser
   node scripts/render.mjs class examples/vehicle.sysml   # parse → extract → Mermaid
   node scripts/verify-examples.mjs  # parse + render every example
   ```

## Try it

Press **F5** (Run Extension). In the new window, open any file from
[examples/](examples/README.md), put the cursor inside its package, right-click →
**Celeris → Show … Diagram** (Flowchart / Class / State / Sequence). Each
command opens its own panel, so you can show several diagrams side by side.

Each panel has a toolbar: **⟳ Refresh** redraws from the current source,
**⤓ PNG** exports the diagram, and zoom/pan controls — **−**, **1:1** (actual
size), **+**, **⤢ Fit** (auto-fit to the window). You can also zoom with the
mouse wheel (toward the cursor), drag to pan, and use the keys `+` / `-` / `0`
(1:1) / `f` (fit).

## Settings

- `celeris.flowchart.direction` — `TB` | `LR` | `BT` | `RL`
- `celeris.theme` — Mermaid theme (`default`, `dark`, `forest`, `neutral`)
- `celeris.autoRefreshOnSave` — redraw open diagrams when their `.sysml`
  file is saved (default: `true`). Each panel also has a **⟳ Refresh** button
  for an on-demand update.
- `celeris.styleFile` — path to a JSON style file (see below).

## Styling elements by SysML type

You can colour diagram elements by their **native SysML type** (`PartUsage`,
`ActionDefinition`, …) and/or by the **SysML type they conform to** (typing or
specialization, followed through the hierarchy). Point `celeris.styleFile`
at a JSON file:

```json
{
  "name": "Arcadia",
  "rules": [
    { "type": "LogicalComponent", "style": { "fill": "#bdd7ee", "stroke": "#2e75b6" } },
    { "type": "PhysicalNode",      "style": { "fill": "#ffe699", "stroke": "#bf9000" } },
    { "nativeType": "ActionUsage", "style": { "fill": "#c6e0b4", "stroke": "#548235" } }
  ]
}
```

**Two ways to activate a style file:**

1. **Command (recommended, most reliable):** run **Celeris: Select Style
   File…** from the Command Palette and pick the JSON. The absolute path is
   remembered globally (independent of workspace/settings) and open diagrams
   refresh immediately. **Celeris: Clear Style File** removes it.
2. **Setting:** `celeris.styleFile` (absolute, or relative to the workspace
   folder / the `.sysml` file).

Run **Celeris: Show Log** (Output → "Celeris") to see which style
file was loaded and how many style directives were emitted — handy if colours
don't appear.

- Each rule selects by `nativeType` and/or `type` (string or array). When both
  are given they must both match. Rules are tried in order; the first match wins.
- `type` matches the whole type hierarchy, so `part def Radio :> LogicalComponent`
  is coloured as a `LogicalComponent`, and so is `part comms : Radio`.
- Styling applies to flowchart, class and state diagrams (via Mermaid `classDef`);
  sequence participants are coloured via Mermaid `box`.

Ready-made methodology profiles (reusable stereotype library + colour code + sample model):

- **Arcadia** — [examples/arcadia/](examples/arcadia/README.md) (functions green, logical blue, physical yellow, operational orange).
- **NAF v4** — [examples/naf/](examples/naf/README.md) (colour by grid layer: Concepts purple, Service blue, Logical green, Physical orange).

## Manual

A PDF user manual (features, changelog, and every example with its
syntax-highlighted SysML, the generated diagram, and a short explanation) is in
[manual/Celeris-Manual.pdf](manual/Celeris-Manual.pdf).
Regenerate it with `npm run manual` (renders via headless Edge/Chrome).

## License

This extension's own code is licensed under the **MIT License** — see [LICENSE](LICENSE).

The distributed extension bundles third-party open-source components, each under
its own license: the SysML v2 parser `syside-languageserver` (and siblings) under
**EPL-2.0 / GPL-2.0 with Classpath exception**, [Mermaid](https://github.com/mermaid-js/mermaid)
and most others under **MIT**, and chevrotain under **Apache-2.0**. Full license
texts and attributions are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)
(regenerate with `node scripts/gen-notices.mjs`). The EPL-2.0 parser source is
available, unmodified, at <https://github.com/sensmetry/sysml-2ls>.
