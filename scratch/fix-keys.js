const fs = require('fs');
let p = 'frontend/src/components/AddPartDrawer.jsx';
let content = fs.readFileSync(p, 'utf8');

// Step 1: name, sku, oem
content = content.replace(
  /value=\{formName\}\n\s*onChange=\{\(e\) => \{ setFormName\(e\.target\.value\); setFormErrors\(prev => \(\{\.\.\.prev, name: ''\}\)\); \}\}/,
  `value={formName}\n                      onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({...prev, name: ''})); }}\n                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}`
);
content = content.replace(
  /value=\{formSku\}\n\s*onChange=\{\(e\) => \{ setFormSku\(e\.target\.value\); setFormErrors\(prev => \(\{\.\.\.prev, sku: ''\}\)\); \}\}/,
  `value={formSku}\n                        onChange={(e) => { setFormSku(e.target.value); setFormErrors(prev => ({...prev, sku: ''})); }}\n                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}`
);
content = content.replace(
  /value=\{formOem\}\n\s*onChange=\{\(e\) => \{ setFormOem\(e\.target\.value\); setFormErrors\(prev => \(\{\.\.\.prev, oem: ''\}\)\); \}\}/,
  `value={formOem}\n                        onChange={(e) => { setFormOem(e.target.value); setFormErrors(prev => ({...prev, oem: ''})); }}\n                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}`
);

// Step 3: price, stock, minStock
content = content.replace(
  /value=\{formPrice\}\n\s*onChange=\{\(e\) => \{ setFormPrice\(e\.target\.value\); setFormErrors\(prev => \(\{\.\.\.prev, price: ''\}\)\); \}\}/,
  `value={formPrice}\n                      onChange={(e) => { setFormPrice(e.target.value); setFormErrors(prev => ({...prev, price: ''})); }}\n                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFormSubmit(e); } }}`
);
content = content.replace(
  /value=\{formStock\}\n\s*onChange=\{\(e\) => \{ setFormStock\(e\.target\.value\); setFormErrors\(prev => \(\{\.\.\.prev, stock: ''\}\)\); \}\}/,
  `value={formStock}\n                        onChange={(e) => { setFormStock(e.target.value); setFormErrors(prev => ({...prev, stock: ''})); }}\n                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFormSubmit(e); } }}`
);
content = content.replace(
  /value=\{formMinStock\}\n\s*onChange=\{\(e\) => \{ setFormMinStock\(e\.target\.value\); setFormErrors\(prev => \(\{\.\.\.prev, minStock: ''\}\)\); \}\}/,
  `value={formMinStock}\n                        onChange={(e) => { setFormMinStock(e.target.value); setFormErrors(prev => ({...prev, minStock: ''})); }}\n                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFormSubmit(e); } }}`
);

fs.writeFileSync(p, content);
