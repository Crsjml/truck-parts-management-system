# Report 5 — Best-Selling Parts

**Status:** Draft for group review
**Data source:** `Transaction` items ranked by units sold
**Based on standard:** Tabular ranking report (with control totals)
**Where it comes from in the app:** Analytics → Best-Selling Parts (today: `frontend/src/components/analytics/BestSellingPartsReport.jsx` → `rankPartsBySales`)

Parts ranked by units sold in the selected period, with rank-movement vs the prior period.

## Field Map

| Field on report | Source | Picture / format | Status |
|-----------------|--------|------------------|--------|
| Period start/end | report parameters | `99/99/9999` | ✅ |
| Rank | `rankPartsBySales` order | `ZZ9` | ✅ |
| Momentum (MOV) | `getRankDeltaBadge` (`NEW`/`▲n`/`▼n`/`—`) | `X(4)` | ✅ |
| Part Name | `TransactionItem.name` / `Part.name` | `X(22)` | ✅ |
| SKU | `Part.sku` | `X(12)` | ✅ |
| Category | `Part.category` | `X(12)` | ✅ |
| Stock | `Part.stock` | `ZZ9` | ✅ |
| Units Sold | ranked quantity | `ZZ9` | ✅ |
| Revenue | ranked revenue | `PHP ZZZ,ZZ9.99` | ✅ |
| Total Units | Σ units | `Z,ZZ9` | ➕ |
| Total Revenue | Σ revenue | `PHP ZZZ,ZZ9.99` | ➕ |
| Pagination line | `Showing X to Y of Z` | text | ✅ |

## A. Report Layout (picture-clause spec)

```
================================================================================
 TARLAC TRUCK PARTS                              BEST-SELLING PARTS REPORT
                                                 Period : 99/99/9999 to 99/99/9999
                                                 Generated: 99/99/9999 99:99
================================================================================
 RANK  MOV   PART NAME               SKU        CATEGORY       STOCK  UNITS      REVENUE
--------------------------------------------------------------------------------
 ZZ9   X(4)  X(22)                   X(12)      X(12)           ZZ9   ZZ9   PHP ZZZ,ZZ9.99
 ZZ9   X(4)  X(22)                   X(12)      X(12)           ZZ9   ZZ9   PHP ZZZ,ZZ9.99
 ZZ9   X(4)  X(22)                   X(12)      X(12)           ZZ9   ZZ9   PHP ZZZ,ZZ9.99
--------------------------------------------------------------------------------
                                            TOTAL UNITS : Z,ZZ9
                                            TOTAL REV   : PHP ZZZ,ZZ9.99
 Showing Z9 to Z9 of Z9 parts                                        Page 9 of 9
================================================================================
```

`MOV` (Momentum) = rank movement vs prior period: `NEW`, `▲n`, `▼n`, or `—`.

## B. Mockup Layout (visual wireframe) — A4 landscape

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │############## BLUE HEADER BAND (#2563EB) ######################################│
 │  TARLAC TRUCK PARTS                     BEST-SELLING PARTS REPORT               │
 │  Period: 09/02/2026 – 10/02/2026        Generated: 10/02/2026 14:35            │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ +------+------+-------------------------+---------+----------+-----+-----+-----------+ │
 │ | RANK | MOV  | PART NAME               | SKU     | CATEGORY |STOCK|UNITS|  REVENUE  | │  <- blue header
 │ +------+------+-------------------------+---------+----------+-----+-----+-----------+ │
 │ |  #1  | NEW  | Brake Pad Set Isuzu ELF | BP-ELF  | Brakes   |  18 |  42 | 35,700.00 | │  <- green badge NEW
 │ |  #2  | ^ 3  | Oil Filter FH-120       | OF-120  | Filters  |  60 |  38 |  8,360.00 | │  <- green up badge
 │ |  #3  | v 1  | Clutch Disc 350mm       | CL-350  | Clutch   |   7 |  25 | 18,750.00 | │  <- red down badge
 │ +------+------+-------------------------+---------+----------+-----+-----+-----------+ │
 │                                               TOTAL UNITS: 105   TOTAL REV: 62,810.00 │  <- bold totals row
 │  Showing 1 to 10 of 24 parts                                          Page 1 of 3     │
 └──────────────────────────────────────────────────────────────────────────────┘
```

**Styling notes**
- Landscape A4 (8 columns need the width).
- Rank in a blue chip; Momentum badge colored: green (NEW / up) vs red (down).
- Numeric columns right-aligned; totals row bold with a top rule.
- Footer carries the pagination line + page number.
