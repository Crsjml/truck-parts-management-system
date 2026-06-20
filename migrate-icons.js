const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const map = {
  'ArrowRight': 'ArrowRight',
  'LogIn': 'SignIn',
  'Search': 'MagnifyingGlass',
  'ShieldCheck': 'ShieldCheck',
  'Sparkles': 'Sparkle',
  'Tag': 'Tag',
  'Truck': 'Truck',
  'UserPlus': 'UserPlus',
  'X': 'X',
  'LayoutDashboard': 'SquaresFour',
  'Package': 'Package',
  'ShoppingCart': 'ShoppingCart',
  'BarChart3': 'ChartBar',
  'Bell': 'Bell',
  'User2': 'User',
  'CalendarDays': 'CalendarBlank',
  'Menu': 'List',
  'Moon': 'Moon',
  'Sun': 'Sun',
  'Activity': 'Activity',
  'FileText': 'FileText',
  'Filter': 'Funnels',
  'ArrowUpRight': 'ArrowUpRight',
  'ArrowDownRight': 'ArrowDownRight',
  'Send': 'PaperPlaneRight',
  'Settings': 'Gear',
  'AlertCircle': 'WarningCircle',
  'CheckCircle2': 'CheckCircle',
  'Info': 'Info',
  'Lock': 'LockKey',
  'Mail': 'EnvelopeSimple',
  'KeyRound': 'Key',
  'Eye': 'Eye',
  'EyeOff': 'EyeSlash',
  'Save': 'FloppyDisk',
  'AlertTriangle': 'Warning',
  'Check': 'Check',
  'Trash2': 'Trash',
  'Edit': 'Pencil',
  'Plus': 'Plus',
  'LogOut': 'SignOut',
  'CreditCard': 'CreditCard',
  'ChevronDown': 'CaretDown',
  'ChevronRight': 'CaretRight',
  'ChevronLeft': 'CaretLeft',
  'MoreVertical': 'DotsThreeVertical',
  'RefreshCw': 'ArrowsClockwise',
  'Download': 'Download',
  'MapPin': 'MapPin',
  'Phone': 'Phone',
  'Clock': 'Clock'
};

const jsxFiles = getFiles(srcDir);

jsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('lucide-react')) {
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/;
    const match = content.match(importRegex);
    
    if (match) {
      const importedNames = match[1].split(',').map(s => s.trim()).filter(Boolean);
      const newNames = new Set();
      
      let modifiedContent = content;

      importedNames.forEach(oldName => {
        let actualName = oldName;
        let alias = null;
        
        if (oldName.includes(' as ')) {
           const parts = oldName.split(' as ');
           actualName = parts[0].trim();
           alias = parts[1].trim();
        }

        const phosphorName = map[actualName] || actualName;
        newNames.add(phosphorName);

        const tagName = alias || actualName;
        
        // Replace opening tags with attributes
        const openTagRegex = new RegExp(`<${tagName}\\s`, 'g');
        modifiedContent = modifiedContent.replace(openTagRegex, `<${phosphorName} weight="duotone" `);
        
        // Replace exact opening tags without attributes
        const openTagRegex2 = new RegExp(`<${tagName}>`, 'g');
        modifiedContent = modifiedContent.replace(openTagRegex2, `<${phosphorName} weight="duotone">`);

        // Replace closing tags
        const closeTagRegex = new RegExp(`</${tagName}>`, 'g');
        modifiedContent = modifiedContent.replace(closeTagRegex, `</${phosphorName}>`);

        // Replace standalone identifiers (like in object mapping `icon: LayoutDashboard`)
        // Ensure we don't accidentally match substrings
        const identifierRegex = new RegExp(`(?<![<\\w\\-])${tagName}(?![\\w\\-])`, 'g');
        modifiedContent = modifiedContent.replace(identifierRegex, phosphorName);
      });

      const newImport = `import { ${Array.from(newNames).join(', ')} } from '@phosphor-icons/react';`;
      modifiedContent = modifiedContent.replace(importRegex, newImport);

      fs.writeFileSync(file, modifiedContent);
      console.log(`Migrated icons in ${path.basename(file)}`);
    }
  }
});
