# Report & Mockup Layouts

Layout drafts for the **6 exportable reports** (PDF exports) of the Tarlac Truck
Parts system. This folder is for **designing and agreeing on the layouts** with
the group. PDF generation wiring is handled separately/later — here we only draft
and confirm how each report looks.

> **Status: DRAFT — awaiting group confirmation.** Nothing here is final until
> the group signs off (see "Open decisions" below).

## How each report file is structured

Every `0X-*.md` file contains **two layout types** for the same report:

- **Section A — Report Layout (picture-clause spec):** the formal systems-analysis
  layout. Defines every field, its position, width, and data format using picture
  notation. This is the precise spec a developer builds the PDF from.
- **Section B — Mockup Layout (visual wireframe):** an at-a-glance visual of how
  the report actually looks on the page (bands, emphasis, alignment), with styling
  notes (colors, weights, paper size).

Each file also has a **Field Map** tracing every printed field back to its source
database column or computed function, so the layout stays grounded in real data.

## Index

| # | Report | Data source | Based on standard | File |
|---|--------|-------------|-------------------|------|
| 1 | Sales Invoice / POS Receipt | `Transaction` + `TransactionItem` | BIR Sales Invoice (PH) | [01-sales-invoice.md](01-sales-invoice.md) |
| 2 | Purchase Order | `PurchaseOrder` (Confirmed+) + items + `Supplier` | Commercial PO | [02-purchase-order.md](02-purchase-order.md) |
| 3 | Request for Quotation (RFQ) | `PurchaseOrder` (Draft / RFQ Sent) + items + `Supplier` | Standard RFQ | [03-rfq.md](03-rfq.md) |
| 4 | Sales Summary | `Transaction` aggregates | Management sales summary | [04-sales-summary.md](04-sales-summary.md) |
| 5 | Best-Selling Parts | `Transaction` items ranked | Tabular ranking report | [05-best-selling-parts.md](05-best-selling-parts.md) |
| 6 | Slow-Moving Stock | `Part` + `Transaction` items | Inventory exception report | [06-slow-moving-stock.md](06-slow-moving-stock.md) |

> **Note:** RFQ (3) and Purchase Order (2) are the **same `PurchaseOrder` record**
> at different lifecycle stages (`Draft → RFQ Sent → Confirmed → Received`). An RFQ
> is a PO before prices are locked — its price columns are left blank for the
> supplier to fill. The two share one skeleton, differing only in the price area.

## Shared notation legend (picture clauses)

| Symbol | Meaning | Example |
|--------|---------|---------|
| `9` | required digit (0–9) | `ZZ9` |
| `Z` | zero-suppressed digit (leading zeros show as blank) | `Z,ZZ9` |
| `X` | any character; `X(n)` = field is `n` characters wide | `X(40)` |
| `,` `.` | inserted literally inside a number | `ZZ,ZZ9.99` |
| `PHP` | currency literal prefix | `PHP ZZ,ZZ9.99` |
| `-` | negative/credit sign (e.g. discounts) | `-PHP ZZ,ZZ9.99` |
| `99/99/9999` | date `mm/dd/yyyy` | `10/02/2026` |
| `99:99` | time `HH:MM` (24h) | `14:35` |
| `____` | blank field, to be hand-filled (RFQ) | `______________` |

## Shared document frame

Every report uses the same masthead and footer so the PDFs read as one family:

```
================================================================================
 TARLAC TRUCK PARTS                                      [ DOCUMENT TITLE ]
 Quality Truck Accessories & Spare Parts                 [ Doc No / Period ]
 Tarlac City, Philippines                                [ Date / Generated ]
 Contact: 0917-XXX-XXXX   TIN: XXX-XXX-XXX-XXX
================================================================================
 [ party / parameter block ]
--------------------------------------------------------------------------------
 [ column headers + detail lines ]
--------------------------------------------------------------------------------
 [ totals / summary block ]
================================================================================
 [ footer: notes · "Page 9 of 9" · generated timestamp ]
================================================================================
```

## Open decisions (group to confirm)

1. **Currency symbol** — `PHP ` prefix (ASCII-safe, matches current code) vs `₱` glyph.
2. **BIR TIN fields** — seller TIN is in the masthead; a customer TIN slot can be
   added on the invoice. Not in the DB yet → keep as static placeholder, or add to schema?
3. **POS Receipt** — treat as a thermal-paper *variant* of Report 1 (recommended),
   or a fully separate 7th layout?
4. **Totals rows** — Reports 5 & 6 gain summary/total rows in the PDF that aren't on
   the live screens. Keep them?

## Legend for status chips used in files

`✅ grounded in code` = field already exists and is displayed/exported today.
`➕ proposed` = new field/row added for the report (needs group OK).

## Print styling (ink-efficient)

All six PDFs share one low-ink scheme, defined in `frontend/src/utils/pdf/reportPdfKit.js`
(site exports) and mirrored in `generate-report-layout-pdfs.cjs` / `generate-report-sample-pdfs.cjs`.

| Token | Value | Used for |
|---|---|---|
| `INK` | gray `0` (pure black, DeviceGray) | primary text, masthead rule, total-box border |
| `INK_2` | gray `70` | secondary text, labels, footer |
| `RULE` / `RULE_SOFT` | gray `150` / `205` | table borders / row separators, KPI tile outlines |
| `TINT_HEAD` | `#EEF1F6` pastel | table header rows |
| `TINT_TOT` | `#F4F6F9` pastel | totals rows, NET TOTAL box |

- **Single-channel black.** Colors are passed to jsPDF as one number, which it writes as
  DeviceGray (`0 g`), so printers use black toner only instead of a CMY+K "rich black".
- **No solid or dark fills.** White masthead (the full-color logo `assets/logo-mark.png` is the only
  color on the page, kept for brand recognition, + one black rule), no zebra striping, outline-only KPI tiles. RGB is reserved for the two pale tints.
- **Guarded by a test.** `frontend/src/utils/__tests__/reportPdfInk.test.js` parses each export's
  PDF content stream and fails on any fill darker than 85% white or any non-pastel RGB color.


## Open-style drafts (adopted by the site exports)

The in-app exports (`frontend/src/utils/*Pdf.js` via `pdf/reportPdfKit.js`) now render this
open style; `reportPdfStructure.test.js` guards it. The drafts remain the design reference.

`generate-report-open-drafts.cjs` (+ `open-drafts/`) renders all six reports in an
"open" table style based on the Systems Design *Output & Data Design* reference. The
legacy grid-style generators and PDFs above are unchanged, for side-by-side comparison.

- Report header on page 1, **page header on every later page** (title, period, page no.)
- Short, stacked headings **justified over their field** (numbers right, text left)
- **No grid:** one rule under headings, single rule above totals, double rule under grand totals
- **Control break** on Slow-Moving by category (category printed once, group subtotals)
- **Zero quantities not printed**; money totals always print
- Picture notation `A` alphabetic · `9` digit · `Z` zero-suppressed digit · `X` alphanumeric

```bash
NODE_PATH="$(pwd)/frontend/node_modules" node docs/reports/generate-report-open-drafts.cjs
# -> docs/reports/report-open-drafts/{layout,sample}/  (+ a 3-page Best-Selling sample)
```
