# NAF v4 profile example

Colours diagram elements by **NAF v4 grid layer** (the grid rows / "subjects of
concern"), driven by `sysmlMermaid` styling.

| File | Role |
| --- | --- |
| [NafProfile.sysml](NafProfile.sysml) | Reusable stereotype library — one part def per NAF layer (`Capability`, `Service`, `LogicalNode`, `PhysicalResource`, `ArchitectureFoundation`) plus layer behaviours. |
| [naf.style.json](naf.style.json) | Colour code by layer. |
| [c2_system.sysml](c2_system.sysml) | A small Command & Control architecture spanning the layers. |

## How to view it with colours

1. Command Palette → **SysML Mermaid: Select Style File…** → pick
   [naf.style.json](naf.style.json).
2. Open [c2_system.sysml](c2_system.sysml), cursor in `C2System`, right-click →
   **SysML Diagram → Show Class Diagram**.

Layer colours (a sensible convention — NAF v4 does not mandate an official
palette):

- **Purple** — Concepts layer / capabilities (`:> Capability`)
- **Blue** — Service layer (`:> Service`)
- **Green** — Logical layer (`:> LogicalNode`, operational activities)
- **Orange** — Physical / Resource layer (`:> PhysicalResource`)
- **Grey** — Architecture foundation (`:> ArchitectureFoundation`)

Sources: [NAF v4 (NATO AC/322)](https://www.nato.int/nato_static_fl2014/assets/pdf/pdf_2018_08/20180801_180801-ac322-d_2018_0002_naf_final.pdf),
[NATO Architecture Framework (Wikipedia)](https://en.wikipedia.org/wiki/NATO_Architecture_Framework).
