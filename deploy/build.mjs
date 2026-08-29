// Wraps the artifact fragment (docs/agentic-commerce-certifier/pitch-deck.html) into a
// standalone HTML document. The Artifact host supplies <!doctype>, <head> and a small
// reset at publish time; a plain static host does not, so we add them here.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../docs/agentic-commerce-certifier/pitch-deck.html");
const out = resolve(here, "public/index.html");

const fragment = readFileSync(src, "utf8");
const title = (fragment.match(/<title>([^<]*)<\/title>/) || [, "GreenLane Pass"])[1];

writeFileSync(out, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="GreenLane — agentic commerce readiness certifier. SMU FinTech Bootcamp capstone.">
<meta property="og:title" content="${title}">
<meta property="og:description" content="An agent can read your store. Can it pay?">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><text y=%2214%22 font-size=%2214%22>🛂</text></svg>">
<style>
  :root{color-scheme:light dark}
  body{margin:0}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
</head>
<body>
${fragment}
</body>
</html>
`);
console.log(`built public/index.html — ${(readFileSync(out).length / 1024).toFixed(1)} KB`);
