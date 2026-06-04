# Stress / load-test examples

Large, **generated** SysML models (one per view, ~10–15× a normal example) to
load-test parsing and rendering. Open one and run the matching **Celeris** command,
or measure headlessly with `npm run load-test`.

| File | View | Rough size |
| --- | --- | --- |
| `flowchart_big.sysml` | Flowchart | 80 actions in a chain + decisions |
| `chains_big.sysml` | Flowchart (functional chains) | 48 functions, 6 chains, 24 performers |
| `class_big.sysml` | Class | 120 definitions, inheritance + composition |
| `breakdown_big.sysml` | Class (BDD) | 156-node function breakdown tree |
| `state_big.sysml` | State | 60 states, ring + branch transitions |
| `sequence_big.sysml` | Sequence | 16 participants, 80 messages |
| `requirement_big.sysml` | Requirement | 80 requirements + derive / contain / satisfy |
| `interconnection_big.sysml` | Interconnection (IBD) | 28 parts + ports, 28 actions + flows |

## Regenerate / resize

The files are produced by a generator — edit the counts there or pass a scale
multiplier:

```bash
npm run stress         # default size (~10–15×)
node scripts/gen-stress-examples.mjs 2   # twice as large
```

## Measure

```bash
npm run load-test
```

Reports, per model: parse errors, **parse time**, **build time** (extraction →
Mermaid), and the Mermaid output size. In practice the **build step is a few
milliseconds** even at hundreds of elements — the cost is dominated by the parser
and, in the webview, by Mermaid's own layout of the resulting graph.

> Generated identifiers avoid SysML reserved words (`state`, `filter`, `in`,
> `out`, `end`, …) which would otherwise be mis-parsed silently.
