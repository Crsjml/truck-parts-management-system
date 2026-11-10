# Report 4 — Sales Summary

**Status:** Draft for group review
**Data source:** `Transaction` aggregates (`computeKpis`, payment mix, order status, top parts)
**Based on standard:** Management sales summary report (with control totals)
**Where it comes from in the app:** Analytics → Daily Sales Summary (today: `frontend/src/components/analytics/DailySalesSummary.jsx` + `frontend/src/utils/salesAnalytics.js`)

A period roll-up of sales. On screen it is a single day; the PDF supports a date range.

## Field Map

| Field on report | Source | Picture / format | Status |
|-----------------|--------|------------------|--------|
| Period start/end | report parameters | `99/99/9999` | ✅ |
| Gross Sales (Total) | Σ `Transaction.total` (`computeKpis.revenue`) | `PHP Z,ZZZ,ZZ9.99` | ✅ |
| Discounts | Σ `Transaction.discount` | `-PHP ZZ,ZZ9.99` | ➕ |
| VATable Sales | Σ `Transaction.subtotal` | `PHP Z,ZZZ,ZZ9.99` | ✅ |
| VAT (12%) | Σ `Transaction.taxAmount` | `PHP ZZZ,ZZ9.99` | ➕ |
| Transaction Count | `computeKpis.invoices` | `Z,ZZ9` | ✅ |
| Units Sold | Σ item quantities | `ZZ,ZZ9` | ✅ |
| Average Ticket | `computeKpis.avgInvoice` | `PHP ZZ,ZZ9.99` | ✅ |
| Payment method / amount / share | `paymentMix` | `X(10)` / `PHP ZZZ,ZZ9.99` / `ZZ9.9%` | ✅ |
| Order status / count | `orderStatusBreakdown` | `X(18)` / `ZZ9` | ✅ |
| Top 5 parts (rank/name/units/rev) | `rankPartsBySales(...,5)` | `Z9` / `X(20)` / `ZZ9` / `PHP ZZ,ZZ9.99` | ✅ |

## A. Report Layout (picture-clause spec)

```
================================================================================
 TARLAC TRUCK PARTS                              S A L E S   S U M M A R Y
 Tarlac City, Philippines                        Period : 99/99/9999 to 99/99/9999
                                                  Generated: 99/99/9999 99:99
================================================================================
 KEY FIGURES
--------------------------------------------------------------------------------
   Gross Sales (Total)        : PHP Z,ZZZ,ZZ9.99
   Less: Discounts            :    -PHP  ZZ,ZZ9.99
   VATable Sales (Subtotal)   : PHP Z,ZZZ,ZZ9.99
   VAT (12%)                  : PHP   ZZZ,ZZ9.99
   Transaction Count          : Z,ZZ9
   Units Sold                 : ZZ,ZZ9
   Average Ticket             : PHP  ZZ,ZZ9.99
--------------------------------------------------------------------------------
 PAYMENT METHOD BREAKDOWN
   METHOD          AMOUNT                 SHARE
   X(10)       PHP ZZZ,ZZ9.99            ZZ9.9%
   X(10)       PHP ZZZ,ZZ9.99            ZZ9.9%
   ------------------------------------------
   TOTAL       PHP Z,ZZZ,ZZ9.99          100.0%
--------------------------------------------------------------------------------
 ORDER STATUS                   TOP 5 SELLING PARTS
   X(18) : ZZ9                    RANK  PART NAME          UNITS      REVENUE
   X(18) : ZZ9                    Z9    X(20)               ZZ9   PHP ZZ,ZZ9.99
   X(18) : ZZ9                    Z9    X(20)               ZZ9   PHP ZZ,ZZ9.99
================================================================================
```

## B. Mockup Layout (visual wireframe) — A4

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │    WHITE MASTHEAD (no fill) - color logo, black text, black rule below   │
 │  TARLAC TRUCK PARTS                           SALES SUMMARY              │
 │  Tarlac City, Philippines      Period: 10/01/2026 – 10/02/2026          │
 │                                Generated: 10/02/2026 14:35              │
 ├────────────────────────────────────────────────────────────────────────┤
 │  KEY FIGURES (KPI tiles)                                                │
 │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────┐ │
 │  │ GROSS SALES   │ │ TRANSACTIONS  │ │ UNITS SOLD    │ │ AVG TICKET  │ │  <- 4 KPI tiles
 │  │ PHP 128,450.00│ │      37       │ │     214       │ │ PHP 3,471.62│ │
 │  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────┘ │
 │  Discounts: -PHP 2,100.00   VATable: PHP 114,687.50   VAT: PHP 13,762.50│  <- tax line
 ├─────────────────────────────────┬──────────────────────────────────────┤
 │  PAYMENT MIX                     │  ORDER STATUS                         │
 │  Cash     PHP 70,000  [ 54.5% ]  │  Completed .......... 29              │
 │  GCash    PHP 38,450  [ 29.9% ]  │  Ready for Pickup ...  5              │
 │  Card     PHP 20,000  [ 15.6% ]  │  Cancelled ..........  3              │
 │  (horizontal % bars)             │                                       │
 ├─────────────────────────────────┴──────────────────────────────────────┤
 │  TOP 5 SELLING PARTS                                                    │
 │  +------+---------------------------+--------+-----------------+         │
 │  | RANK | PART NAME                 | UNITS  |     REVENUE     |         │
 │  |  1   | Brake Pad Set - Isuzu ELF |   42   |  PHP 35,700.00  |         │
 │  |  2   | Oil Filter FH-120         |   38   |   PHP 8,360.00  |         │
 │  +------+---------------------------+--------+-----------------+         │
 └────────────────────────────────────────────────────────────────────────┘
```

**Styling notes**
- KPI tiles across the top, drawn as outline-only boxes (no fill) to save toner. See README "Print styling" — white page, single-channel black/gray text, pale-tint table headers, no solid fills.
- Payment mix uses horizontal percentage bars; shares sum to 100%.
- Two-column middle band (Payment Mix | Order Status), table below.
- `➕` Discounts and VAT totals are new to the PDF (not totaled on screen today).
