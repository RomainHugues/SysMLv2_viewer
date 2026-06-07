# Tabular views

Display elements as a **table**. Right-click in a package → **Celeris → Show
Table…**, then pick a table. Tables render as HTML and **export to CSV** (⤓ button).

## Built-in presets (no config needed)

| Table | Rows | Columns |
| --- | --- | --- |
| **Requirements** | `requirement def`s | Id, Text, Subject, Derived from, Satisfied by |
| **Interfaces** | `connect` / `interface` | Interface, Kind, Source `part.port`, Target `part.port`, Item flows traversing |
| **Elements** | any named definition/usage | Name, Kind, Type, Doc |

Try them on [system.sysml](system.sysml) (interfaces + flows) and on
[../vehicle_requirements.sysml](../vehicle_requirements.sysml) (requirements with
derive & satisfy).

## Configuring your own tables

A view = a **row selector** + **columns**. Point the `celeris.tableConfig` setting
at a JSON file (absolute, or relative to the workspace / the `.sysml` file):

```jsonc
// .vscode/settings.json
"celeris.tableConfig": "examples/tables/celeris.table.json"
```

See [celeris.table.json](celeris.table.json):

```jsonc
{ "tables": [
  { "id": "logical-components", "title": "Logical components",
    "select": { "conformsTo": "LogicalComponent" },          // by conformed (Arcadia/NAF) type
    "columns": [ {"header":"Name","value":"name"}, {"header":"Type","value":"type"} ] },
  { "id": "functions", "title": "Functions",
    "select": { "type": ["ActionDefinition","ActionUsage"] }, // by SysML $type
    "columns": [ {"header":"Function","value":"name"}, {"header":"Kind","value":"kind"} ] } ] }
```

- **`select`** — `type` (one or more SysML `$type`s, e.g. `PartDefinition`) and/or
  `conformsTo` (a conformed type / stereotype short name, e.g. `LogicalComponent`).
- **`columns[].value`** — an accessor: `name`, `qualifiedName`, `kind`, `type`,
  `doc`, `stereotype`, or `attribute:<name>`.

Configured tables appear alongside the presets in the **Show Table…** picker.
