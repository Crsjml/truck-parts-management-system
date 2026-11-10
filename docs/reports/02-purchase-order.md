# Report 2 — Purchase Order

**Status:** Draft for group review
**Data source:** `PurchaseOrder` (status `Confirmed`+) + `PurchaseOrderItem` + `Supplier`
**Based on standard:** Commercial Purchase Order
**Where it comes from in the app:** Purchasing module → PO view → "Download PO" (today: `generatePDF` in `frontend/src/components/PurchasingModule.jsx`)

A PO is a `PurchaseOrder` after prices are locked (`Confirmed`/`Received`). Shares a
skeleton with the RFQ (Report 3); the difference is that prices are **filled in** here.

## Field Map

| Field on report | Source | Picture / format | Status |
|-----------------|--------|------------------|--------|
| PO No | `PurchaseOrder.poNumber` | `X(10)` | ✅ |
| Date | `PurchaseOrder.createdAt` / `orderDate` | `99/99/9999` | ✅ |
| Status | `PurchaseOrder.status` | `X(12)` | ✅ |
| Expected Delivery | `PurchaseOrder.expectedDeliveryDate` | `99/99/9999` | ✅ |
| Source RFQ | `PurchaseOrder.sourceRfq` | `X(10)` | ✅ |
| Supplier Name | `Supplier.name` | `X(40)` | ✅ |
| Contact Person | `Supplier.contactPerson` | `X(30)` | ✅ |
| Address | `Supplier.address` | `X(40)` | ✅ |
| Phone / Email | `Supplier.phone` / `Supplier.email` | `X(20)` / `X(30)` | ✅ |
| Payment Terms | `Supplier.paymentTerms` | `X(12)` | ✅ |
| Line: SKU | `PurchaseOrderItem.sku` | `X(12)` | ✅ |
| Line: description | `PurchaseOrderItem.name` | `X(26)` | ✅ |
| Line: qty | `PurchaseOrderItem.quantity` | `ZZ9` | ✅ |
| Line: unit price | `PurchaseOrderItem.unitPrice` | `PHP ZZ,ZZ9.99` | ✅ |
| Line: amount | `PurchaseOrderItem.subtotal` | `PHP ZZZ,ZZ9.99` | ✅ |
| Grand Total | `PurchaseOrder.totalAmount` | `PHP Z,ZZZ,ZZ9.99` | ✅ |
| Notes | `PurchaseOrder.notes` | `X(60)` | ✅ |
| Prepared by | `PurchaseOrder.createdBy` | `X(20)` | ✅ |

## A. Report Layout (picture-clause spec)

```
================================================================================
 TARLAC TRUCK PARTS                                  P U R C H A S E   O R D E R
 Tarlac City, Philippines                            PO No   : X(10)
 Contact: 0917-XXX-XXXX                               Date    : 99/99/9999
                                                      Status  : X(12)
================================================================================
 SUPPLIER (Vendor):                        DELIVER TO:
   X(40)                                      Tarlac Truck Parts
   Attn: X(30)                                Tarlac City, Philippines
   X(40)   (address)
   Tel: X(20)  Email: X(30)                 Expected Delivery : 99/99/9999
   Payment Terms: X(12)                     Source RFQ        : X(10)
--------------------------------------------------------------------------------
 #    SKU         DESCRIPTION              QTY     UNIT PRICE        AMOUNT
--------------------------------------------------------------------------------
 Z9   X(12)       X(26)                    ZZ9  PHP ZZ,ZZ9.99  PHP ZZZ,ZZ9.99
 Z9   X(12)       X(26)                    ZZ9  PHP ZZ,ZZ9.99  PHP ZZZ,ZZ9.99
--------------------------------------------------------------------------------
                                                 GRAND TOTAL : PHP Z,ZZZ,ZZ9.99
--------------------------------------------------------------------------------
 Notes: X(60)
 Prepared by: X(20)                        Authorized Signature: ______________
================================================================================
```

## B. Mockup Layout (visual wireframe) — A4

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │    WHITE MASTHEAD (no fill) - gray logo, black text, black rule below   │
 │  TARLAC TRUCK PARTS                              PURCHASE ORDER          │
 │  Tarlac City, Philippines                       PO No : PO-000045        │
 │  Contact: 0917-XXX-XXXX                         Date  : 10/02/2026       │
 │                                                 Status: [ CONFIRMED ]    │  <- status pill
 ├─────────────────────────────────┬──────────────────────────────────────┤
 │  SUPPLIER (VENDOR)              │  DELIVER TO                           │
 │  Diesel Parts Trading Corp.     │  Tarlac Truck Parts                   │
 │  Attn: Mr. Reyes                │  Tarlac City, Philippines             │
 │  12 Industrial Ave, Manila      │                                       │
 │  Tel: 02-8xxx   dpt@mail.com    │  Expected Delivery : 10/20/2026       │
 │  Payment Terms: Net 30          │  Source RFQ        : RFQ-000045       │
 ├─────────────────────────────────┴──────────────────────────────────────┤
 │  +--+-------+-----------------------+-----+-------------+--------------+ │
 │  | #| SKU   | DESCRIPTION           | QTY |  UNIT PRICE |    AMOUNT    | │  <- pale-tint header, bold black text
 │  +--+-------+-----------------------+-----+-------------+--------------+ │
 │  | 1|BP-ELF | Brake Pad Set - ELF   |  20 | PHP 650.00  | PHP 13,000.00| │
 │  | 2|OF-120 | Oil Filter FH-120     |  50 | PHP 160.00  |  PHP 8,000.00| │
 │  +--+-------+-----------------------+-----+-------------+--------------+ │
 │                                        GRAND TOTAL :     PHP 21,000.00  │  <- bold, right-aligned
 ├────────────────────────────────────────────────────────────────────────┤
 │  Notes: Restock for Q4 demand.                                          │
 │                                                                         │
 │  Prepared by: Admin            Authorized Signature: __________________ │  <- signature line
 └────────────────────────────────────────────────────────────────────────┘
```

**Styling notes**
- Ink-efficient print styling shared by all six reports (no colored band). See README "Print styling" — white page, single-channel black/gray text, pale-tint table headers, no solid fills.
- Two-column party block: Supplier (left) vs Deliver To (right).
- Status rendered as a pill (Draft / RFQ Sent / Confirmed / Received).
- Signature line bottom-right for manual authorization.
