# Breakdown structures (BDD)

A **breakdown structure** is a decomposition tree — the whole on top, its parts
below, recursively. In SysML this is the **Block Definition Diagram (BDD)**, which
Celeris renders as the **Class** diagram: the *whole–part* relation is **composition**.

| File | Structure |
| --- | --- |
| [function_breakdown.sysml](function_breakdown.sysml) | **Function** breakdown (FBS) — `action def`s decomposed into sub-functions. |
| [component_breakdown.sysml](component_breakdown.sysml) | **Component** breakdown (PBS) — `part def`s decomposed into sub-components. |

## How it works

Model each node as a **definition** and each decomposition as a **typed usage**:

```sysml
action def Mission {
    action surveil : Surveil;   // Mission is composed of Surveil…
    action engage  : Engage;
}
action def Surveil {
    action detect : Detect;     // …Surveil is composed of Detect, Track, …
    action track  : Track;
}
```

```sysml
part def Drone {
    part propulsion : Propulsion;   // Drone is composed of Propulsion…
    part avionics   : Avionics;
}
part def Propulsion {
    part motor   : Motor;           // …Propulsion is composed of Motor, Battery, …
    part battery : Battery;
}
```

Then right-click in the package → **Celeris → Show Class Diagram**. Each definition
becomes a box (functions get the `«action»` stereotype) and each typed usage becomes
a composition edge — giving a top-down breakdown tree.

> Tip: use the **Inherited** view toggle to hide any supertypes, and the **Defs**
> toggle is a no-op here (everything is a definition).
