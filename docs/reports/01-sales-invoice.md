# Report 1 — Sales Invoice / POS Receipt

**Status:** Draft for group review
**Data source:** `Transaction` + `TransactionItem`
**Based on standard:** BIR Sales Invoice (Philippines)
**Where it comes from in the app:** POS checkout → "Download Invoice" (today: `frontend/src/utils/invoicePdf.js`)

The invoice is the only report already visually branded in code. The **POS Receipt**
is the same data on narrow thermal paper (see Section C).

## Field Map

| Field on report | Source | Picture / format | Status |
|-----------------|--------|------------------|--------|
| Invoice No | `Transaction.invoiceNumber` | `X(10)` | ✅ |
| Date / time | `Transaction.transactionDate` | `99/99/9999 99:99` | ✅ |
| Customer Name | `Transaction.customerName` | `X(40)` | ✅ |
| Contact | `Transaction.customerContact` | `X(20)` | ✅ |
| Line: description | `TransactionItem.name` | `X(32)` | ✅ |
| Line: unit price | `TransactionItem.price` | `PHP ZZ,ZZ9.99` | ✅ |
| Line: qty | `TransactionItem.quantity` | `ZZ9` | ✅ |
| Line: amount | `price * quantity` | `PHP ZZZ,ZZ9.99` | ✅ |
| Subtotal (VATable) | `Transaction.subtotal` | `PHP ZZZ,ZZ9.99` | ✅ |
| Discount | `Transaction.discount` | `-PHP ZZ,ZZ9.99` | ✅ |
| VAT (12%) | `Transaction.taxAmount` (`tax`=12) | `PHP ZZ,ZZ9.99` | ✅ |
| Net Total | `Transaction.total` | `PHP ZZZ,ZZ9.99` | ✅ |
| Payment Method | `Transaction.paymentMethod` | `X(12)` | ✅ |
| Tendered / Change | `amountTendered` / `changeGiven` | `PHP ZZ,ZZ9.99` | ✅ (cash) |
| Cheque No / Bank | `chequeNumber` / `chequeBank` | `X(20)` | ✅ (cheque) |
| GCash Ref | `gcashReference` | `X(20)` | ✅ (gcash) |
| Seller TIN | — | `XXX-XXX-XXX-XXX` | ➕ placeholder |

## A. Report Layout (picture-clause spec)

```
================================================================================
 TARLAC TRUCK PARTS                                  S A L E S   I N V O I C E
 Quality Truck Accessories & Spare Parts             Invoice No : X(10)
 Tarlac City, Philippines                            Date       : 99/99/9999 99:99
 Contact: 0917-XXX-XXXX   TIN: XXX-XXX-XXX-XXX
================================================================================
 BILL TO:
   Customer Name : X(40)
   Contact       : X(20)
--------------------------------------------------------------------------------
 #    PART DESCRIPTION                 UNIT PRICE       QTY          AMOUNT
--------------------------------------------------------------------------------
 Z9   X(32)                       PHP ZZ,ZZ9.99        ZZ9    PHP ZZZ,ZZ9.99
 Z9   X(32)                       PHP ZZ,ZZ9.99        ZZ9    PHP ZZZ,ZZ9.99
 Z9   X(32)                       PHP ZZ,ZZ9.99        ZZ9    PHP ZZZ,ZZ9.99
--------------------------------------------------------------------------------
                                   Subtotal (VATable) :      PHP ZZZ,ZZ9.99
                                   Discount           :     -PHP  ZZ,ZZ9.99
                                   VAT (12%)          :      PHP  ZZ,ZZ9.99
                                   ========================================
                                   NET TOTAL          :      PHP ZZZ,ZZ9.99
--------------------------------------------------------------------------------
 Payment Method : X(12)
   [CASH]   Tendered: PHP ZZ,ZZ9.99    Change: PHP ZZ,ZZ9.99
   [CHEQUE] Cheque No: X(20) - X(20)
   [GCASH]  GCash Ref: X(20)
================================================================================
 Thank you for your business!
 Return Policy: Exchange valid within 7 days with this sales invoice.
================================================================================
```

## B. Mockup Layout (visual wireframe) — A4

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │################ BLUE HEADER BAND (brand #2563EB) #######################│
 │  TARLAC TRUCK PARTS                             SALES INVOICE           │
 │  Quality Truck Accessories & Spare Parts        Invoice No: INV-000123  │
 │  Tarlac City, Philippines                       Date: 10/02/2026 14:35  │
 │  Contact: 0917-XXX-XXXX                                                 │
 │~~~~~~~~~~~~~~~~ red accent rule (#DC2626) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│
 ├────────────────────────────────────────────────────────────────────────┤
 │  BILL TO / CUSTOMER INFO                                                │
 │  Customer Name: Juan Dela Cruz        Contact Phone: 0917-123-4567      │
 ├────────────────────────────────────────────────────────────────────────┤
 │  +--+---------------------------+------------+-----+---------------+     │
 │  | #| PART DESCRIPTION          | UNIT PRICE | QTY |     AMOUNT    |     │  <- blue header row
 │  +--+---------------------------+------------+-----+---------------+     │
 │  | 1| Brake Pad Set - Isuzu ELF |  PHP 850.00|   2 |  PHP 1,700.00 |     │
 │  | 2| Oil Filter FH-120         |  PHP 220.00|   4 |    PHP 880.00 |     │  <- zebra striping
 │  +--+---------------------------+------------+-----+---------------+     │
 │                                   Subtotal (VATable):    PHP 2,580.00   │
 │                                   Discount         :     -PHP 100.00    │
 │                                   VAT (12%)        :      PHP 297.60    │
 │                                 +-------------------------------------+  │
 │                                 | NET TOTAL        :     PHP 2,777.60|  │  <- filled blue box, white bold
 │                                 +-------------------------------------+  │
 │  Payment: CASH    Tendered: PHP 3,000.00   Change: PHP 222.40           │
 ├────────────────────────────────────────────────────────────────────────┤
 │  Thank you for your business!                                           │
 │  Return Policy: Exchange valid within 7 days with this sales invoice.   │  <- grey italic, centered
 └────────────────────────────────────────────────────────────────────────┘
```

**Styling notes**
- Header band `#2563EB`, thin accent rule `#DC2626`, zebra rows `#F7F9FC`.
- Money right-aligned; NET TOTAL in a filled blue box, white bold.
- Payment block switches by method (cash / cheque / gcash lines are conditional).
- "(DUPLICATE)" watermark variant when reprinting.

## C. POS Receipt variant (thermal, 58/80mm)

Same data, single narrow column, monospace, no color.

```
      TARLAC TRUCK PARTS
   Tarlac City, Philippines
   Tel: 0917-XXX-XXXX
--------------------------------
 INVOICE: INV-000123
 10/02/2026 14:35
 Cust: Juan Dela Cruz
--------------------------------
 Brake Pad Set - Isuzu ELF
   2 x 850.00        1,700.00
 Oil Filter FH-120
   4 x 220.00          880.00
--------------------------------
 Subtotal           2,580.00
 Discount            -100.00
 VAT (12%)            297.60
 TOTAL              2,777.60
 CASH               3,000.00
 CHANGE               222.40
--------------------------------
   Thank you for your business!
  Exchange within 7 days w/ slip
```
