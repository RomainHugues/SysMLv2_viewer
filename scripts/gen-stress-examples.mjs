// Generate large "stress" SysML models (one per view) under examples/stress/, to
// load-test parsing and rendering. Usage: node scripts/gen-stress-examples.mjs [scale]
//   scale = size multiplier for the linear models (default 1 ~= 10-15x a normal example).
// Names avoid SysML reserved words (state, filter, in, out, end, ...).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "examples/stress");
fs.mkdirSync(outDir, { recursive: true });

const S = Math.max(1, Number(process.argv[2]) || 1);
const range = (n) => Array.from({ length: n }, (_, i) => i);

// 1) Flowchart — a long action flow with periodic decision nodes.
function flowchart() {
  const A = 80 * S;
  const L = ["package StressFlowchart {", "    action def BigProcess {"];
  for (const i of range(A)) L.push(`        ${i % 15 === 14 ? "decide" : "action"} a${i};`);
  for (const i of range(A - 1)) L.push(`        succession first a${i} then a${i + 1};`);
  L.push("    }", "}");
  return L.join("\n") + "\n";
}

// 2) Functional chains + performers (flowchart view).
function chains() {
  const F = 48 * S, C = 6, P = 24 * S;
  const L = ["package StressChains {", "    action MissionThread {"];
  for (const i of range(F)) L.push(`        action f${i};`);
  for (const i of range(F - 1)) L.push(`        succession first f${i} then f${i + 1};`);
  L.push("    }");
  const win = Math.ceil(F / C) + 4; // overlapping windows -> shared functions
  for (const c of range(C)) {
    L.push(`    use case def Chain${c} {`);
    const start = Math.floor((c * (F - win)) / Math.max(1, C - 1));
    for (let i = start; i < start + win && i < F; i++) L.push(`        perform MissionThread.f${i};`);
    L.push("    }");
  }
  for (const p of range(P)) {
    L.push(`    part def Comp${p};`);
    L.push(`    part comp${p} : Comp${p} { perform MissionThread.f${p % F}; }`);
  }
  L.push("}");
  return L.join("\n") + "\n";
}

// 3) Class — many definitions with inheritance and composition.
function classDiagram() {
  const C = 120 * S;
  const L = ["package StressClass {", "    part def Base0;", "    part def Base1;", "    part def Base2;"];
  for (const i of range(C)) {
    L.push(`    part def C${i} :> Base${i % 3} {`);
    if (i + 1 < C) L.push(`        part p${i}a : C${i + 1};`);
    if (i + 7 < C) L.push(`        part p${i}b : C${i + 7};`);
    L.push("    }");
  }
  L.push("}");
  return L.join("\n") + "\n";
}

// 4) Breakdown (BDD) — a deep function decomposition tree.
function breakdown() {
  const B = 5, D = 3; // 1 + 5 + 25 + 125 = 156 nodes
  const childrenOf = {};
  const levels = [["r"]];
  for (let d = 0; d < D; d++) {
    const next = [];
    for (const id of levels[d]) {
      childrenOf[id] = range(B).map((k) => `${id}${k}`);
      next.push(...childrenOf[id]);
    }
    levels.push(next);
  }
  const all = levels.flat();
  const L = ["package StressBreakdown {"];
  for (const id of all) {
    const kids = childrenOf[id];
    if (kids) {
      L.push(`    action def Fn${id} {`);
      kids.forEach((c, k) => L.push(`        action s${k} : Fn${c};`));
      L.push("    }");
    } else {
      L.push(`    action def Fn${id};`);
    }
  }
  L.push("}");
  return L.join("\n") + "\n";
}

// 5) State machine — many states, a ring plus branch transitions.
function state() {
  const N = 60 * S;
  const L = ["package StressState {", "    state def BigMachine {", "        entry; then St0;"];
  for (const i of range(N)) L.push(`        state St${i};`);
  for (const i of range(N - 1)) L.push(`        transition first St${i} then St${i + 1};`);
  L.push(`        transition first St${N - 1} then St0;`);
  for (let i = 5; i < N; i += 12) L.push(`        transition first St${i} then St${(i + 20) % N};`);
  L.push("    }", "}");
  return L.join("\n") + "\n";
}

// 6) Sequence — participants exchanging many flow messages.
function sequence() {
  const P = 16, M = 80 * S;
  const L = ["package StressSequence {"];
  for (const i of range(P)) L.push(`    part def P${i};`);
  for (const i of range(P)) L.push(`    part p${i} : P${i};`);
  for (const m of range(M)) L.push(`    flow m${m} from p${m % P} to p${(m + 1) % P};`);
  L.push("}");
  return L.join("\n") + "\n";
}

// 7) Requirements — derivation, containment, dependencies and satisfy.
function requirement() {
  const R = 80 * S;
  const L = ["package StressRequirements {", "    part def Sys;"];
  for (const i of range(R)) {
    const sup = i >= 4 && i % 3 === 0 ? ` :> Rq${i - 4}` : "";
    L.push(`    requirement def Rq${i}${sup} {`, `        doc /* Requirement ${i}. */`, "    }");
  }
  L.push("    requirement def Spec {", "        subject sys : Sys;");
  for (let i = 0; i * 5 < R && i < 16; i++) L.push(`        requirement n${i} : Rq${i * 5};`);
  L.push("    }");
  for (let i = 0; i < R; i += 9) L.push(`    dependency from Rq${i} to Rq${(i + 3) % R};`);
  L.push("    part sys : Sys {");
  for (let i = 1; i < 24 && i < R; i += 6) L.push(`        satisfy Rq${i};`);
  L.push("    }", "}");
  return L.join("\n") + "\n";
}

// 8) Interconnection (IBD) — parts/ports/connects/interfaces + actions/in-out/flows.
function interconnection() {
  const KP = 28 * S, KA = 28 * S;
  const L = ["package StressInterconnection {", "    port def DP;", "    interface def Link { end s : DP; end t : DP; }"];
  for (const i of range(KP)) L.push(`    part def K${i} { port qa : DP; port qb : DP; }`);
  for (const i of range(KA)) L.push(`    action def A${i} {${i === 0 ? "" : " in ref inp;"} out ref outp; }`);
  L.push("    part def BigSystem {");
  for (const i of range(KP)) L.push(`        part k${i} : K${i};`);
  for (const i of range(KP - 1)) {
    L.push(i % 7 === 0
      ? `        interface lk${i} : Link connect k${i}.qb to k${i + 1}.qa;`
      : `        connect k${i}.qb to k${i + 1}.qa;`);
  }
  L.push("    }", "    action def BigThread {");
  for (const i of range(KA)) L.push(`        action ac${i} : A${i};`);
  for (const i of range(KA - 1)) L.push(`        flow from ac${i}.outp to ac${i + 1}.inp;`);
  L.push("    }", "}");
  return L.join("\n") + "\n";
}

const FILES = {
  "flowchart_big.sysml": flowchart(),
  "chains_big.sysml": chains(),
  "class_big.sysml": classDiagram(),
  "breakdown_big.sysml": breakdown(),
  "state_big.sysml": state(),
  "sequence_big.sysml": sequence(),
  "requirement_big.sysml": requirement(),
  "interconnection_big.sysml": interconnection(),
};

for (const [name, content] of Object.entries(FILES)) {
  fs.writeFileSync(path.join(outDir, name), content, "utf8");
  console.log(`wrote examples/stress/${name}  (${content.split("\n").length} lines)`);
}
console.log(`\nscale = ${S}`);
