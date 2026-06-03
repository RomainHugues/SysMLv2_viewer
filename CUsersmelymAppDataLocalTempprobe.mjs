import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
const repo = "C:/Users/melym/Documents/Romain/SysMLv2_viewer";
const { parserAlias } = await import(pathToFileURL(path.join(repo, "esbuild.mjs")).href);
const S = (p) => JSON.stringify(path.join(repo, p));
const harness = `
import { flowToMermaid } from ${S("src/diagrams/flowchart/mermaid.ts")};
const model = { groups: [ { id:"g", label:"g", nodes:[
  {id:"a",label:"a",kind:"action"},
  {id:"p",label:"p",kind:"part"},
], edges:[ {source:"a",target:"p",kind:"perform"} ] } ] };
const out = flowToMermaid(model, { direction:"TB" });
console.log(out);
console.log("=== linkStyle count:", (out.match(/linkStyle/g)||[]).length);
`;
const outfile = path.join(repo, "dist/_probe.cjs");
await esbuild.build({ stdin:{contents:harness,resolveDir:repo,loader:"ts",sourcefile:"p.ts"}, bundle:true, platform:"node", format:"cjs", target:"node18", outfile, alias:parserAlias, logLevel:"warning" });
await import(pathToFileURL(outfile).href);
fs.rmSync(outfile,{force:true}); fs.rmSync(outfile+".map",{force:true});
