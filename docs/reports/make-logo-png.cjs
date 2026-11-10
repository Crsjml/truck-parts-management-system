/*
 * Rasterizes the Tarlac Truck Parts logo (ported from
 * frontend/src/components/Logo.jsx) to a transparent high-res PNG for embedding
 * in the report-layout PDFs. Run once (re-run if the logo design changes):
 *   NODE_PATH="$(pwd)/frontend/node_modules" node docs/reports/make-logo-png.cjs
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
fs.mkdirSync(OUT, { recursive: true });
const PNG = path.join(OUT, 'logo.png');

// Gear teeth — same formula as Logo.jsx.
const teeth = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  const x1 = 150 + 65 * Math.cos(a), y1 = 150 + 65 * Math.sin(a);
  const x2 = 150 + 82 * Math.cos(a), y2 = 150 + 82 * Math.sin(a);
  const s = Math.sin(a), c = Math.cos(a);
  return `<path d="M ${x1 - 10 * s} ${y1 + 10 * c} L ${x2 - 8 * s} ${y2 + 8 * c} ` +
         `L ${x2 + 8 * s} ${y2 - 8 * c} L ${x1 + 10 * s} ${y1 - 10 * c} Z" />`;
}).join('\n');

const WRAP = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="600" height="600">${inner}</svg>`;

// Pistons + gear + rings (the emblem) — shared by both outputs.
const core = `
  <g stroke="#1e3a8a" stroke-width="6" fill="#0f172a">
    <path d="M40,40 L90,90 M30,50 L80,100" stroke-width="4" />
    <rect x="25" y="25" width="45" height="30" rx="3" transform="rotate(-45 47 40)" fill="#1e3a8a" stroke="#e2e8f0" stroke-width="3" />
    <line x1="30" y1="50" x2="60" y2="20" stroke="#e2e8f0" stroke-width="3" />
    <rect x="230" y="25" width="45" height="30" rx="3" transform="rotate(45 252 40)" fill="#1e3a8a" stroke="#e2e8f0" stroke-width="3" />
    <line x1="60" y1="60" x2="110" y2="110" stroke="#e2e8f0" stroke-width="8" />
    <line x1="60" y1="60" x2="110" y2="110" stroke="#1b365d" stroke-width="4" />
    <line x1="240" y1="60" x2="190" y2="110" stroke="#e2e8f0" stroke-width="8" />
    <line x1="240" y1="60" x2="190" y2="110" stroke="#1b365d" stroke-width="4" />
    <circle cx="120" cy="120" r="16" fill="#0f172a" stroke="#e2e8f0" stroke-width="5" />
    <circle cx="120" cy="120" r="6" fill="#1b365d" />
    <circle cx="180" cy="120" r="16" fill="#0f172a" stroke="#e2e8f0" stroke-width="5" />
    <circle cx="180" cy="120" r="6" fill="#1b365d" />
  </g>
  <g fill="#dc2626" stroke="#ffffff" stroke-width="2.5">
    <circle cx="150" cy="150" r="70" />
    ${teeth}
  </g>
  <circle cx="150" cy="150" r="48" fill="none" stroke="#1b365d" stroke-width="10" />
  <circle cx="150" cy="150" r="53" fill="none" stroke="#ffffff" stroke-width="2" />
  <circle cx="150" cy="150" r="43" fill="none" stroke="#ffffff" stroke-width="2" />
  <circle cx="150" cy="150" r="35" fill="#ffffff" />`;

// Banner wordmark — included only in the full logo, not the header mark.
const banner = `
  <rect x="15" y="128" width="270" height="44" rx="4" fill="#ffffff" stroke="#dc2626" stroke-width="4" />
  <line x1="20" y1="134" x2="280" y2="134" stroke="#1b365d" stroke-width="2" />
  <line x1="20" y1="166" x2="280" y2="166" stroke="#1b365d" stroke-width="2" />
  <text x="150" y="151" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="21" fill="#1b365d" letter-spacing="0.5">TARLAC TRUCK</text>
  <text x="150" y="167" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="12" fill="#dc2626" letter-spacing="2">PARTS</text>`;

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2 });
  for (const [name, inner] of [['logo.png', core + banner], ['logo-mark.png', core]]) {
    const file = path.join(OUT, name);
    await page.setContent(`<!doctype html><html><body style="margin:0">${WRAP(inner)}</body></html>`);
    await (await page.$('svg')).screenshot({ path: file, omitBackground: true });
    console.log('Wrote ' + file);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
