// Generate THIRD-PARTY-NOTICES.txt from the EXACT set of packages bundled into the
// extension: the parser bundle (vendor/syside.cjs inputs, discovered via an esbuild
// metafile against the clone) + Mermaid. Copies each package's real license text.
//
//   node scripts/gen-notices.mjs      (needs the sysml-2ls clone at ../_sysml-2ls-src
//                                       or SYSIDE_DIR; and node_modules/mermaid)
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const SYSIDE = process.env.SYSIDE_DIR || path.resolve(repo, "../_sysml-2ls-src/packages/syside-languageserver");
const cloneRoot = path.resolve(SYSIDE, "../..");

const LICENSE_NAMES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "COPYING", "LICENSE-MIT"];

function findLicenseText(dir) {
  for (const name of LICENSE_NAMES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  }
  return null;
}

function readPkg(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function authorOf(pkg) {
  const a = pkg.author || (Array.isArray(pkg.contributors) && pkg.contributors[0]);
  if (!a) return null;
  return typeof a === "string" ? a.replace(/\s*<[^>]*>/, "").replace(/\s*\([^)]*\)/, "").trim() : a.name || null;
}

// Standard MIT / ISC license bodies, for packages that ship no LICENSE file.
function spdxText(license, holder) {
  const c = `Copyright (c) ${holder || "the respective authors"}`;
  if (/MIT/i.test(license)) {
    return `MIT License\n\n${c}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
  }
  if (/ISC/i.test(license)) {
    return `ISC License\n\n${c}\n\nPermission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE.`;
  }
  return null;
}

// Map a bundled input file to the owning package directory + name.
function packageOf(file) {
  const abs = path.resolve(file);
  const norm = abs.replace(/\\/g, "/");
  // workspace EPL packages: .../packages/syside-<x>/...
  const ws = norm.match(/\/packages\/(syside-[a-z]+)\//);
  if (ws) return { name: ws[1], dir: path.join(cloneRoot, "packages", ws[1]), group: "epl" };
  // node_modules packages (last occurrence), scoped or not
  const idx = norm.lastIndexOf("/node_modules/");
  if (idx === -1) return null;
  const rest = norm.slice(idx + "/node_modules/".length);
  const parts = rest.split("/");
  const name = parts[0].startsWith("@") ? parts[0] + "/" + parts[1] : parts[0];
  const dir = abs.slice(0, idx) + "/node_modules/" + name;
  return { name, dir, group: "dep" };
}

const alias = {
  "syside-languageserver": path.join(SYSIDE, "lib/index.js"),
  "syside-languageserver/node": path.join(SYSIDE, "lib/node/index.js"),
  langium: path.join(SYSIDE, "node_modules/langium"),
};
const entry = `
export { createSysMLServices } from "syside-languageserver";
export { SysMLNodeFileSystem } from "syside-languageserver/node";
export { findLeafNodeAtOffset, streamAllContents, streamReferences } from "langium";
`;

const result = await esbuild.build({
  stdin: { contents: entry, resolveDir: repo, loader: "js", sourcefile: "vendor-entry.js" },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  metafile: true,
  alias,
  logLevel: "silent",
});

// Collect unique packages from the parser bundle inputs.
const pkgs = new Map(); // name -> {name, version, license, dir, group, text, copyright, homepage}
for (const file of Object.keys(result.metafile.inputs)) {
  const info = packageOf(file);
  if (!info || pkgs.has(info.name)) continue;
  if (info.name === "syside-base" || info.name === "syside-protocol" || info.name === "syside-languageserver") {
    info.group = "epl";
  }
  const pkg = readPkg(info.dir) || {};
  pkgs.set(info.name, {
    name: info.name,
    version: pkg.version || "?",
    license: pkg.license || (info.group === "epl" ? "EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0" : "?"),
    group: info.group,
    text: findLicenseText(info.dir),
    copyright: authorOf(pkg),
    homepage: pkg.homepage || (pkg.repository && (pkg.repository.url || pkg.repository)) || "",
  });
}

// Add Mermaid (copied verbatim into media/, pre-bundled).
{
  const dir = path.join(repo, "node_modules/mermaid");
  const pkg = readPkg(dir) || {};
  pkgs.set("mermaid", {
    name: "mermaid",
    version: pkg.version || "?",
    license: pkg.license || "MIT",
    group: "mermaid",
    text: findLicenseText(dir),
    homepage: (pkg.repository && (pkg.repository.url || pkg.repository)) || pkg.homepage || "https://github.com/mermaid-js/mermaid",
  });
}

const eplText = findLicenseText(cloneRoot); // EPL/GPL dual license text from the clone root
const sorted = [...pkgs.values()].sort((a, b) => a.name.localeCompare(b.name));

let out = `THIRD-PARTY NOTICES
===================

The "SysML v2 Mermaid Viewer" extension is licensed under the MIT License (see
LICENSE). The distributed artifact (dist/extension.js and media/mermaid.min.js)
additionally bundles the third-party open-source components listed below, each
under its own license. Those licenses and copyright notices are reproduced here.

For the EPL-2.0 / GPL-2.0 components (the SysML v2 parser "syside-languageserver"
and its sibling packages), the corresponding source code is available, unmodified,
at: https://github.com/sensmetry/sysml-2ls (also gitlab.com/sensmetry/public/sysml-2ls).

Mermaid is shipped as its pre-built distribution (media/mermaid.min.js), which itself
incorporates further open-source components under permissive licenses; their notices
are maintained in the Mermaid project: https://github.com/mermaid-js/mermaid.

================================================================================
Summary of bundled components
================================================================================
`;

for (const p of sorted) {
  out += `\n- ${p.name}@${p.version} — ${p.license}${p.homepage ? " — " + String(p.homepage).replace(/^git\+/, "").replace(/\.git$/, "") : ""}`;
}

out += `\n\n`;

for (const p of sorted) {
  out += `\n================================================================================\n`;
  out += `${p.name}@${p.version}  (${p.license})\n`;
  out += `================================================================================\n\n`;
  const text = p.text || (p.group === "epl" ? eplText : null) || spdxText(p.license, p.copyright);
  if (text) {
    out += text + "\n";
  } else {
    out += `License: ${p.license}. License text not bundled with the package; see ${p.homepage || "the package homepage"}.\n`;
  }
}

fs.writeFileSync(path.join(repo, "THIRD-PARTY-NOTICES.txt"), out, "utf8");
console.log(`[notices] ${sorted.length} components written to THIRD-PARTY-NOTICES.txt`);
console.log(sorted.map((p) => `${p.name}@${p.version} (${p.license})`).join("\n"));
