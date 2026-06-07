# Gantt (schedule) view

Turn an **activity sequence** into a **Gantt schedule**. Right-click in the package
→ **Celeris → Show Gantt Diagram**.

- **Activities** = `action`s; **dependencies** = `succession`s (a task starts after
  all its predecessors finish).
- **Planning attributes** on each action:
  - `attribute duration = <days>;` → the bar length.
  - `attribute resource = "<name>";` → the bar colour (one colour per resource;
    activities are grouped into a **section per resource**).
- The **critical path** — the chain of activities that sets the total duration — is
  **outlined in red**.

```sysml
action def Mission {
    action acquire  { attribute duration = 2; attribute resource = "Sensor"; }
    action classify { attribute duration = 4; attribute resource = "GPU"; }
    action assess   { attribute duration = 1; attribute resource = "CPU"; }
    succession first acquire then classify;
    succession first acquire then assess;   // shorter branch -> has slack, not critical
}
```

See [mission.sysml](mission.sysml).

## Notes

- Dates are **relative** — the schedule starts at a fixed base date; only durations
  and ordering matter. The duration unit is **days** (`Nd`).
- Earliest starts and the critical path are computed by the **Critical Path Method**
  (forward/backward pass); a task with zero slack is critical.
- `decide` and `filter` are SysML reserved words — name actions e.g. `assess` /
  `filtering` instead.
