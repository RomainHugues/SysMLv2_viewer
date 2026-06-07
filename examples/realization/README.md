# Realization views

A **realization view** shows how elements at one **engineering level** are realized
by elements at another — the cross-level traceability of an Arcadia/NAF model.

| File | Shows |
| --- | --- |
| [cross_level.sysml](cross_level.sysml) | Operational → System → Logical → Physical, wired by realization dependencies. |

## How it works

1. **Set each element's level** by specializing a level marker type (the Arcadia /
   NAF profile types). The viewer reads the conformed-type hierarchy:

   ```sysml
   part def FlightController :> LogicalComponent;   // -> Logical lane
   action def DetectIntrusion :> SystemFunction;    // -> System lane
   part def OnboardComputer  :> PhysicalNode;       // -> Physical lane
   ```

   Recognised lanes (in order): **Operational / Concepts** → **System / Service** →
   **Logical** → **Physical** (Arcadia `OperationalEntity/Activity`,
   `SystemComponent/Function`, `LogicalComponent/Function/Node`,
   `PhysicalComponent/Function/Node`; NAF `Capability`, `Service`, `LogicalNode`,
   `PhysicalResource`). Anything else goes to an **Other** lane.

2. **Link elements across levels** with a `dependency` (a named one keeps its name
   as the edge label):

   ```sysml
   dependency from DetectIntrusion to ConductSurveillance;  // realizes
   dependency trace from FlightController to Operator;       // labelled "trace"
   ```

Then right-click in the package → **Celeris → Show Realization Diagram**. Elements
are laid out in lanes by level (most abstract on top), coloured by level (or by the
active style file), with the realization dependencies drawn as dashed arrows pointing
to the element they realize.

> Base SysML `dependency` names must be unique, so use a plain `dependency from … to …`
> for the (many) realization links and reserve named dependencies for the few you want
> labelled. `allocate` is not shown yet (easy to add if needed).
