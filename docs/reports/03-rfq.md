# Report 3 — Request for Quotation (RFQ)

**Status:** Draft for group review
**Data source:** `PurchaseOrder` (status `Draft` / `RFQ Sent`) + `PurchaseOrderItem` + `Supplier`
**Based on standard:** Standard Request for Quotation
**Where it comes from in the app:** Purchasing module → RFQ view → "Download RFQ" (today: `generateRfqPDF` in `frontend/src/components/PurchasingModule.jsx`)

An RFQ is the **same `PurchaseOrder` record** as Report 2, before prices are agreed.
Key difference: **Unit Price and Total are blank** — the supplier fills them in and
sends the quote back. Once priced and confirmed, the record becomes a Purchase Order.

## Field Map

| Field on report | Source | Picture / format | Status |
|-----------------|--------|------------------|--------|
| RFQ No | `PurchaseOrder.poNumber` | `X(10)` | ✅ |
| Date | current date at export | `99/99/9999` | ✅ |
| Supplier Name | `Supplier.name` | `X(40)` | ✅ |
| Supplier Email | `Supplier.email` | `X(30)` | ✅ |
| Line: SKU | `PurchaseOrderItem.sku` | `X(12)` | ✅ |
| Line: description | `PurchaseOrderItem.name` | `X(26)` | ✅ |
| Line: qty required | `PurchaseOrderItem.quantity` | `ZZ9` | ✅ |
| Line: your unit price | *(blank — supplier fills)* | `____________` | ✅ |
| Line: total | *(blank — supplier fills)* | `____________` | ✅ |
| Quotation valid until | *(blank — supplier fills)* | `____________` | ➕ |

## A. Report Layout (picture-clause spec)

```
================================================================================
 TARLAC TRUCK PARTS                              REQUEST FOR QUOTATION
 Tarlac City, Philippines                        RFQ No  : X(10)
 Contact: 0917-XXX-XXXX                           Date    : 99/99/9999
================================================================================
 TO (Supplier):
   X(40)
   Email: X(30)
 Please provide your best quotation for the following items (prices in PHP):
--------------------------------------------------------------------------------
 #    SKU / DESCRIPTION               QTY REQ      YOUR UNIT PRICE       TOTAL
--------------------------------------------------------------------------------
 Z9   [X(12)] X(26)                      ZZ9     ______________   ____________
 Z9   [X(12)] X(26)                      ZZ9     ______________   ____________
 Z9   [X(12)] X(26)                      ZZ9     ______________   ____________
--------------------------------------------------------------------------------
 Quotation Valid Until : ____________    Supplier Name/Signature: ___________
 Please reply at your earliest convenience.
================================================================================
```

## B. Mockup Layout (visual wireframe) — A4

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │############## NAVY HEADER BAND (#1B365D) ###############################│
 │  TARLAC TRUCK PARTS                           REQUEST FOR QUOTATION      │
 │  Tarlac City, Philippines                     RFQ No : RFQ-000045        │
 │  Contact: 0917-XXX-XXXX                       Date   : 10/02/2026        │
 ├────────────────────────────────────────────────────────────────────────┤
 │  TO (SUPPLIER)                                                          │
 │  Diesel Parts Trading Corp.                                             │
 │  Email: dpt@mail.com                                                    │
 │                                                                         │
 │  Please provide your best quotation for the following items (in PHP):   │  <- instruction line
 │  +--+-----------------------------+----------+------------------+------+ │
 │  | #| SKU / DESCRIPTION           | QTY REQ  | YOUR UNIT PRICE  | TOTAL| │  <- navy header row
 │  +--+-----------------------------+----------+------------------+------+ │
 │  | 1| [BP-ELF] Brake Pad Set ELF  |    20    | _______________  |______| │  <- blank fill-in cells
 │  | 2| [OF-120] Oil Filter FH-120  |    50    | _______________  |______| │
 │  | 3| [__]                        |          | _______________  |______| │
 │  +--+-----------------------------+----------+------------------+------+ │
 │                                                                         │
 │  Quotation Valid Until: ____________                                    │
 │  Supplier Name / Signature: ________________________                    │  <- supplier fills
 │  Please reply at your earliest convenience.                             │
 └────────────────────────────────────────────────────────────────────────┘
```

**Styling notes**
- Same navy masthead as the PO so the two read as one document family.
- Price + Total columns are intentionally **empty ruled cells** for handwriting/typing.
- Emphasize the instruction line ("provide your best quotation…").
- Bottom: supplier signature + validity date fields.
