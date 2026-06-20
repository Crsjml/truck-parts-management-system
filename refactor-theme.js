const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'frontend/src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.jsx'));

const mappings = [
  // Backgrounds
  { regex: /bg-slate-950(?:\/\d+)?/g, replace: 'bg-background' },
  { regex: /bg-slate-[89]00(?:\/\d+)?/g, replace: 'bg-secondary' },
  
  // Text
  { regex: /text-slate-100/g, replace: 'text-foreground' },
  { regex: /text-slate-200/g, replace: 'text-foreground' },
  { regex: /text-slate-300/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-400/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-500/g, replace: 'text-muted-foreground' },
  { regex: /text-white/g, replace: 'text-foreground' },
  
  // But fix button text-white
  { regex: /bg-accent(.*?)text-foreground/g, replace: 'bg-accent$1text-white' },
  { regex: /bg-red-(.*?)(text-foreground)/g, replace: 'bg-red-$1text-white' },
  
  // Borders
  { regex: /border-slate-[78]00(?:\/\d+)?/g, replace: 'border-border' },
  
  // Font
  { regex: /font-outfit/g, replace: 'font-display' },
];

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  mappings.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Refactored ${file}`);
});
