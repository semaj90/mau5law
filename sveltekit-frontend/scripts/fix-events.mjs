import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");

const map = [
  ["on:click", "onclick"],
  ["on:submit", "onsubmit"],
  ["on:change", "onchange"],
  ["on:input", "oninput"],
  ["on:keydown", "onkeydown"],
  ["on:keyup", "onkeyup"],
  ["on:focus", "onfocus"],
  ["on:blur", "onblur"],
  ["on:mouseenter", "onmouseenter"],
  ["on:mouseleave", "onmouseleave"],
  ["on:mousedown", "onmousedown"],
  ["on:mouseup", "onmouseup"],
  ["on:mousemove", "onmousemove"],
  ["on:contextmenu", "oncontextmenu"],
  ["on:wheel", "onwheel"],
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (p.endsWith(".svelte")) out.push(p);
  }
  return out;
}

function replaceEventDirectives(s) {
  // Replace all on: patterns with on (remove the colon), preserving modifiers
  return s.replaceAll(/on:([a-zA-Z_][a-zA-Z0-9_]*)([^\s=]*)=/g, 'on$1$2=');
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = replaceEventDirectives(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed++;
    console.log("updated:", file);
  }
}

console.log(`done. files changed: ${changed}/${files.length}`);