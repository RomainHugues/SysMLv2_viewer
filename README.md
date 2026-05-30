# SysML v2 Mermaid Viewer

A VS Code extension that renders the contents of a **SysML v2 package** as a
**Mermaid** diagram. Put your cursor inside a package in a `.sysml` file,
right-click, and pick a diagram type — the package is shown in a webview panel,
with irrelevant elements filtered out. Several diagrams can be open at once
(one per panel).

Diagram types: **flowchart**, **class**, **state** and **sequence** (all
implemented). See [examples/](examples/README.md) for a sample model per type.

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
**SysML Diagram → Show … Diagram** (Flowchart / Class / State / Sequence). Each
command opens its own panel, so you can show several diagrams side by side.

Each panel has a toolbar: **⟳ Refresh** redraws from the current source, and
**⤓ PNG** exports the diagram as a PNG image.

## Settings

- `sysmlMermaid.flowchart.direction` — `TB` | `LR` | `BT` | `RL`
- `sysmlMermaid.theme` — Mermaid theme (`default`, `dark`, `forest`, `neutral`)
- `sysmlMermaid.autoRefreshOnSave` — redraw open diagrams when their `.sysml`
  file is saved (default: `true`). Each panel also has a **⟳ Refresh** button
  for an on-demand update.

## License

This extension's own code is licensed under the **MIT License** — see [LICENSE](LICENSE).

The distributed extension bundles third-party open-source components, each under
its own license: the SysML v2 parser `syside-languageserver` (and siblings) under
**EPL-2.0 / GPL-2.0 with Classpath exception**, [Mermaid](https://github.com/mermaid-js/mermaid)
and most others under **MIT**, and chevrotain under **Apache-2.0**. Full license
texts and attributions are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)
(regenerate with `node scripts/gen-notices.mjs`). The EPL-2.0 parser source is
available, unmodified, at <https://github.com/sensmetry/sysml-2ls>.
