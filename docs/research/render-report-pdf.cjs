/*
 * Renders software-benchmark-report.html to a print-quality PDF using the
 * Chromium build bundled with Playwright (already in frontend/node_modules).
 * APA layout (1-in margins, page number top-right) is applied at print time.
 */
const path = require('path');

const DIR = __dirname;
const HTML = path.join(DIR, 'software-benchmark-report.html');
const OUT = path.join(DIR, 'software-benchmark-report.pdf');

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + HTML, { waitUntil: 'networkidle' });

  await page.pdf({
    path: OUT,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
    headerTemplate:
      '<div style="width:100%; font-family:\'Times New Roman\',serif; font-size:10px; ' +
      'padding:0 1in; text-align:right;"><span class="pageNumber"></span></div>',
    footerTemplate: '<div></div>',
  });

  await browser.close();
  console.log('Wrote ' + OUT);
})().catch((err) => { console.error(err); process.exit(1); });
