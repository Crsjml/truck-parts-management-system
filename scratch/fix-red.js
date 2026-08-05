const fs = require('fs');

function replaceReds(text) {
  return text
    .replace(/border-red-500\/50/g, 'border-destructive/50')
    .replace(/border-red-500/g, 'border-destructive')
    .replace(/text-red-400/g, 'text-destructive')
    .replace(/text-red-500/g, 'text-destructive')
    .replace(/ring-red-500\/20/g, 'ring-destructive/20')
    .replace(/ring-red-500/g, 'ring-destructive')
    .replace(/red-950\/60/g, 'destructive/10')
    .replace(/bg-red-950\/60/g, 'bg-destructive/10')
    .replace(/border-red-700\/50/g, 'border-destructive/30')
    .replace(/text-red-300/g, 'text-destructive')
    .replace(/hover:bg-red-500\/10/g, 'hover:bg-destructive/10')
    .replace(/hover:border-red-500\/30/g, 'hover:border-destructive/30')
    .replace(/focus:border-red-600/g, 'focus:border-destructive')
    .replace(/focus:border-red-500/g, 'focus:border-destructive');
}

let p1 = 'frontend/src/components/AddPartDrawer.jsx';
let content1 = fs.readFileSync(p1, 'utf8');
content1 = replaceReds(content1);
fs.writeFileSync(p1, content1);

let p2 = 'frontend/src/components/PartsCatalog.jsx';
let content2 = fs.readFileSync(p2, 'utf8');
let lines2 = content2.split('\n');
for (let i = 990; i < 1180; i++) {
  if (lines2[i]) {
    lines2[i] = replaceReds(lines2[i]);
  }
}
fs.writeFileSync(p2, lines2.join('\n'));
