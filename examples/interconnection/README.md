# Interconnection (Internal Block Diagram)

The **Interconnection** view is the SysML **Internal Block Diagram (IBD)**: it shows
how the inside of a block is wired — **parts** through their **ports**, and
**functions** through their **in / out** parameters and **item flows**.

| File | Shows |
| --- | --- |
| [avionics_power.sysml](avionics_power.sysml) | **Structure** — `part`s with `port`s, wired by `connect` and a typed `interface`. |
| [signal_chain.sysml](signal_chain.sysml) | **Behaviour** — `action`s with `in`/`out` `ref` parameters, wired by item `flow`s. |

## How it works

A diagram is produced for each **containing definition** (`part def` or `action def`)
that wires its internal parts/actions together. Right-click in the package →
**Celeris → Show Interconnection Diagram**.

**Structure** — ports on parts, connections / interfaces between them:

```sysml
part def Battery { port power : PowerPort; }
part def Avionics {
    part battery : Battery;
    part bus : PowerBus;
    interface supply : PowerLink connect battery.power to bus.feed;  // bold connector
    connect bus.tapA to fc.power;                                    // thin connector
}
```

**Behaviour** — directed parameters on actions, item flows between them:

```sysml
action def Acquire { out ref reading; }
action def Filter  { in ref raw; out ref clean; }
action def Thread {
    action acquire : Acquire;
    action filtering : Filter;
    flow from acquire.reading to filtering.raw;   // directed (green) item flow
}
```

In the diagram:

- Each part / action is a **block**; its ports / parameters are nodes on the block.
- A direction marker shows `in` (`▸ name`) vs `out` (`name ▸`).
- A plain **`connect`** is a thin line, a typed **`interface`** a bold (purple)
  connector, and an item **`flow`** a directed (green) arrow labelled with the item.

> `filter` is a reserved word in SysML v2 — name the action usage `filtering`.
