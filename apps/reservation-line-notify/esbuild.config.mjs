import { copyFileSync, mkdirSync, readFileSync } from "fs";
import { build } from "esbuild";

mkdirSync("dist", { recursive: true });

// GASエディタ/トリガーUI 用のトップレベルラッパーを IIFE の外に付与する
const uiFooter = readFileSync("ui-wrappers.js", "utf8");

await build({
  entryPoints: ["src/gas/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/Code.js",
  legalComments: "none",
  footer: { js: uiFooter },
});

copyFileSync("appsscript.json", "dist/appsscript.json");
console.log("bundled -> dist/Code.js");
