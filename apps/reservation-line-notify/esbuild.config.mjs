import { copyFileSync, mkdirSync } from "fs";
import { build } from "esbuild";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/gas/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/Code.js",
  legalComments: "none",
});

copyFileSync("appsscript.json", "dist/appsscript.json");
console.log("bundled -> dist/Code.js");
