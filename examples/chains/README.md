# Functional chains (Capella-style)

Highlight **functional chains** in a flowchart — the way Capella does — with bold
coloured borders on the functions and flows of each chain.

| File | Role |
| --- | --- |
| [surveillance.sysml](surveillance.sysml) | A functional architecture with 3 chains sharing one function, plus their performers. |

## How it works

Model each chain the SysML v2 way — as a **`use case`** that **`perform`s** the
functions (actions) it traverses. A function performed by several use cases is the
one **shared** by several chains:

```sysml
action MissionThread {
    action detect;
    action identify;
    action engage;
    // ...
}

use case def Engagement {
    perform MissionThread.detect;
    perform MissionThread.identify;   // identify is also performed by the other chains
    perform MissionThread.engage;
}
```

The **performers** — the components that realise each function — are `part`s that
`perform` the same actions (these `perform`s do *not* define chains):

```sysml
part sensor : Sensor {
    perform MissionThread.detect;
}
```

In the flowchart each performer appears as a **green component** node linked to the
action(s) it performs by a dashed *performed by* edge — actions (blue) and parts
(green) are colour-coded by default (a style file can override this).

Then right-click in the package → **Celeris → Show Flowchart Diagram**:

- Functions and the flows between them get a **bold border in the chain colour**.
- A function (or flow) shared by **several chains** gets a **dark bold border**
  (in the example, `identify` is the junction of all three chains).
- A **legend** lists the chains and their colours.
- Each chain is assigned a distinct colour automatically.

Chain colouring is independent of the type-based fill styling, so you can combine
it with an Arcadia/NAF style file (fill = layer, border = chain).
