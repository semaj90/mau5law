#!/usr/bin/env node
/*
  fix-type-union-commas.mjs
  Uses ts-morph to safely convert type unions written with commas into pipe-delimited unions.
  E.g. "type T = A, B" -> "type T = A | B"

  Dry-run by default. Pass --apply to modify files.
*/
import fs from 'fs';
import path from 'path';
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'sveltekit-frontend/tsconfig.json', skipAddingFilesFromTsConfig: true });

function collectFiles(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...collectFiles(full));
    else if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.d.ts'))) res.push(full);
  }
  return res;
}

const root = path.resolve('sveltekit-frontend');
const files = collectFiles(root);
let scanned = 0;
let fixed = 0;
const changes = [];

for (const f of files) {
  scanned++;
  const sourceFile = project.addSourceFileAtPathIfExists(f);
  if (!sourceFile) continue;
  let fileChanged = false;

  // Look for TypeAliasDeclaration and InterfaceDeclaration property signatures with comma-separated union in typeText
  const typeAliases = sourceFile.getTypeAliases();
  for (const ta of typeAliases) {
    const typeNode = ta.getTypeNode();
    if (!typeNode) continue;
    const text = typeNode.getText();
    if (/,/.test(text) && !/\|/.test(text)) {
      // naive heuristic: replace commas with pipes inside the type text
      const newText = text.replace(/,\s*/g, ' | ');
      typeNode.replaceWithText(newText);
      fileChanged = true;
    }
  }

  // Also inspect property signatures in interfaces
  const interfaces = sourceFile.getInterfaces();
  for (const iface of interfaces) {
    for (const prop of iface.getProperties()) {
      const t = prop.getTypeNode();
      if (!t) continue;
      const txt = t.getText();
      if (/,/.test(txt) && !/\|/.test(txt)) {
        const newTxt = txt.replace(/,\s*/g, ' | ');
        t.replaceWithText(newTxt);
        fileChanged = true;
      }
    }
  }

  if (fileChanged) {
    changes.push(f);
    fixed++;
    if (process.argv.includes('--apply')) {
      sourceFile.saveSync();
    }
  }
}

console.log('Type union fixer summary');
console.log(`Scanned: ${scanned}`);
console.log(`Files changed: ${fixed}`);
if (changes.length) console.log(changes.slice(0, 100));
