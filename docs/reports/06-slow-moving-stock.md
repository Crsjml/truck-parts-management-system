# Report 6 — Slow-Moving Stock

**Status:** Draft for group review
**Data source:** `Part` + `Transaction` items
**Based on standard:** Inventory exception report (with control totals)
**Where it comes from in the app:** Analytics → Slow-Moving Stock (today: `frontend/src/components/analytics/SlowMovingStockReport.jsx` → `slowMovingParts`)

Exception report: parts that **have stock on hand** but sold **zero units** in the
selected period — candidates for promotion, markdown, or de-listing.

## Field Map

| Field on report | Source | Picture / format | Status |
|-----------------|--------|------------------|--------|
| Period start/end | report parameters | `99/99/9999` | ✅ |
| Part Name | `Part.name` | `X(28)` | ✅ |
| SKU | `Part.sku` | `X(12)` | ✅ |
| Current Stock | `Part.stock` | `ZZ9` | ✅ |
| Units Sold (Period) | computed in `slowMovingParts` | `ZZ9` | ✅ |
| Last Sale | `daysSinceLastSale` (`N days ago` / `Never`) | `ZZ9 days ago` | ✅ |
| Total Idle Parts | row count | `ZZ9` | ➕ |
| Total Idle Stock Units | Σ stock | `Z,ZZ9` | ➕ |
| Pagination line | `Showing X to Y of Z` | text | ✅ |

## A. Report Layout (picture-clause spec)

```
================================================================================
 TARLAC TRUCK PARTS                              SLOW-MOVING STOCK REPORT
                                                 Period : 99/99/9999 to 99/99/9999
                                                 Generated: 99/99/9999 99:99
 Criteria: parts with stock on hand and 0 units sold during the period
================================================================================
 PART NAME                    SKU            CURRENT STOCK   UNITS SOLD    LAST SALE
--------------------------------------------------------------------------------
 X(28)                        X(12)                   ZZ9          ZZ9   ZZ9 days ago
 X(28)                        X(12)                   ZZ9            0   Never
 X(28)                        X(12)                   ZZ9          ZZ9   ZZ9 days ago
--------------------------------------------------------------------------------
        TOTAL IDLE PARTS : ZZ9        TOTAL IDLE STOCK UNITS : Z,ZZ9
 Showing Z9 to Z9 of Z9 slow-moving parts                            Page 9 of 9
================================================================================
```

## B. Mockup Layout (visual wireframe) — A4

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │############## NAVY HEADER BAND (#1B365D) ###############################│
 │  TARLAC TRUCK PARTS                        SLOW-MOVING STOCK REPORT      │
 │  Period: 09/02/2026 – 10/02/2026           Generated: 10/02/2026 14:35  │
 │  Criteria: has stock on hand AND 0 units sold in the period             │  <- criteria subline
 ├────────────────────────────────────────────────────────────────────────┤
 │ +-----------------------------+----------+---------------+-------+-------------+ │
 │ | PART NAME                   | SKU      | CURRENT STOCK | SOLD  |  LAST SALE  | │  <- navy header
 │ +-----------------------------+----------+---------------+-------+-------------+ │
 │ | Radiator Cap 1.1bar         | RC-11    |      34       |   0   | 92 days ago | │
 │ | Wiper Blade 22"             | WB-22    |      18       |   0   |   Never     | │  <- amber "Never"
 │ | Tail Lamp Assy - Fuso       | TL-FU    |       6       |   0   | 140 days ago| │
 │ +-----------------------------+----------+---------------+-------+-------------+ │
 │        TOTAL IDLE PARTS: 12          TOTAL IDLE STOCK UNITS: 418              │  <- bold totals row
 │  Showing 1 to 10 of 12 slow-moving parts                       Page 1 of 2     │
 └────────────────────────────────────────────────────────────────────────┘
```

**Styling notes**
- Navy masthead (operational/internal report).
- "SOLD" column reads `0` for every row by definition (zero-sales criteria); kept for clarity.
- "Last Sale" highlights `Never` in amber to flag never-sold stock.
- Bold totals row summarizes how much idle inventory is tied up.
