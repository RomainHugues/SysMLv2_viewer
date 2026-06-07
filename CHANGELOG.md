# Changelog

All notable changes to **Celeris** are documented here.

## 0.3.0

### Added
- **Realization diagram** — a seventh view for **cross-level traceability**:
  elements are laid out in **engineering-level lanes** (Operational → System →
  Logical → Physical, from each element's conformed Arcadia/NAF profile type) with
  **realization** `dependency` links drawn between the levels.

## 0.2.0

### Added
- **Interconnection diagram (IBD)** — a sixth view showing a block's internal
  wiring: **parts** through their **ports** (`connect` / `interface`) and
  **functions** through their **in/out** `ref` parameters and item **`flow`**s.
- **Breakdown structures** — the **class** diagram now doubles as a SysML **Block
  Definition Diagram (BDD)**: function (`action def`) and component (`part def`)
  decomposition trees render as composition trees.

## 0.1.0

### Added
- **Functional chains (Capella-style)** in flowcharts. Model each chain as a
  `use case` that `perform`s the functions it traverses; the chain's functions
  and flows get a bold coloured border, functions shared by several chains get a
  dark border, and a legend lists the chains.
- **Performers** in flowcharts. A `part` that `perform`s an action is shown as a
  green component linked to that action by a dashed *performed by* (allocation)
  edge — so a flowchart also shows which component realises each function.
- **Built-in flowchart colour code** by node kind, applied even without a style
  file (and overridable by one): actions blue, control nodes amber, events
  purple, performer parts green.
- **View toggles** in the panel toolbar — **Defs** and **Inherited** — to
  declutter the class and requirement diagrams: hide the definition boxes and/or
  the inherited types (inheritance edges and the imported supertypes they point
  to). Each toggle is per-panel and persists across refreshes.

## 0.0.1

### Added
- Initial release. Render a SysML v2 package as a Mermaid diagram from the
  editor (right-click → Celeris), with five diagram types: **flowchart**,
  **class**, **state**, **sequence** and **requirement**.
- In-process parsing with the open-source SysML v2 parser
  (`syside-languageserver`); sibling profile libraries resolved automatically.
- **Type-based styling** from a JSON style file (colour by native SysML type
  and/or by conformed type), with ready-made **Arcadia** and **NAF v4** profiles.
- Per-panel toolbar: refresh, PNG export, zoom/pan, and a syntax-error indicator;
  auto-refresh open diagrams on save.
