import React from 'react';

// Sanitize user text before rendering to prevent XSS/injection in print views
function safe(value) {
  if (value == null) return '';
  return String(value).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default function PosReceipt({ tx, formatCurrency }) {
  if (!tx) return null;

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:text-black print:p-4 print:text-xs font-mono">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pos-thermal-receipt, #pos-thermal-receipt * { visibility: visible; }
          #pos-thermal-receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 10px; font-family: monospace; }
        }
      `}</style>
      
      <div id="pos-thermal-receipt" className="w-[80mm] mx-auto text-black bg-white p-2">
        <div className="text-center pb-2 border-b border-dashed border-black">
          <h2 className="text-base font-bold uppercase">Tarlac Truck Parts</h2>
          <p className="text-[10px]">Quality Spare Parts & Accessories</p>
          <p className="text-[10px]">Tarlac City, Philippines</p>
        </div>

        <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
          <p><strong>Inv #:</strong> {safe(tx.invoiceNumber)}</p>
          <p><strong>Date:</strong> {new Date(tx.transactionDate || Date.now()).toLocaleString()}</p>
          <p><strong>Customer:</strong> {safe(tx.customerName || 'Walk-in Customer')}</p>
          {tx.customerContact && <p><strong>Contact:</strong> {safe(tx.customerContact)}</p>}
        </div>

        <table className="w-full text-left my-2 text-[10px] border-b border-dashed border-black pb-2">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1">Item</th>
              <th className="text-center">Qty</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {tx.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1 pr-1 truncate max-w-[40mm]">{safe(item.name)}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-[10px] pt-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(tx.subtotal)}</span>
          </div>
          {tx.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(tx.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>VAT (12%):</span>
            <span>{formatCurrency(tx.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
            <span>TOTAL:</span>
            <span>{formatCurrency(tx.total)}</span>
          </div>
        </div>

        <div className="py-2 border-t border-b border-dashed border-black my-2 text-[10px] space-y-0.5">
          <p><strong>Payment:</strong> {safe(tx.paymentMethod)}</p>
          {tx.paymentMethod === 'CASH' && tx.amountTendered != null && (
            <>
              <p>Tendered: {formatCurrency(tx.amountTendered)}</p>
              <p>Change: {formatCurrency(tx.changeGiven || 0)}</p>
            </>
          )}
          {tx.paymentMethod === 'CHEQUE' && (
            <p>Cheque #{safe(tx.chequeNumber)} ({safe(tx.chequeBank)})</p>
          )}
          {tx.paymentMethod === 'GCASH' && (
            <p>GCash Ref: {safe(tx.gcashReference)}</p>
          )}
        </div>

        <div className="text-center text-[9px] pt-2 italic">
          <p>Thank you for your business!</p>
          <p>Exchange allowed within 7 days w/ receipt.</p>
        </div>
      </div>
    </div>
  );
}
