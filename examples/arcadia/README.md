# Arcadia profile example

Demonstrates styling diagram elements with the [Arcadia](https://mbse-capella.org/arcadia.html)
colour code, driven by `celeris.styleFile`.

| File | Role |
| --- | --- |
| [ArcadiaProfile.sysml](ArcadiaProfile.sysml) | Reusable stereotype library (`OperationalEntity`, `LogicalComponent`, `PhysicalNode`, `LogicalFunction`, …). Import it and specialize the stereotypes. |
| [arcadia.style.json](arcadia.style.json) | The colour code: components and functions mapped to fills/strokes by their Arcadia type. |
| [drone_system.sysml](drone_system.sysml) | A sample drone system using the profile. |

## How to view it with colours

1. Set the style file in VS Code settings (`.vscode/settings.json` or user settings):
   ```json
   { "celeris.styleFile": "examples/arcadia/arcadia.style.json" }
   ```
2. Open [drone_system.sysml](drone_system.sysml), put the cursor in the
   `DroneSystem` package, right-click → **Celeris → Show Class Diagram**.

Expected colours:

- **Orange** — operational entities (`:> OperationalEntity`)
- **Blue** — logical components (`:> LogicalComponent`)
- **Yellow** — physical nodes (`:> PhysicalNode`)
- **Green** — functions / actions (`:> LogicalFunction`, or any action node)

The match follows the type hierarchy: `part def FlightController :> LogicalComponent`
is blue, and so is a usage `part drone : FlightController`.

> The reusable library is resolved because the viewer also loads sibling
> `.sysml` files in the same folder tree, so `private import ArcadiaProfile::*;`
> works without extra project configuration.
