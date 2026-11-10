import React from 'react';
import { StatusBadge } from '../ui/PurchasingAtoms';

/**
 * Every delivered item currently flagged at inspection, across all POs.
 * @param {{
 *   rows: Array<{ key: string, po: object, poNumber: string, supplier: string,
 *     sku: string, name: string, reason: string, remarks: string, status: string }>,
 *   onOpen: (po: object) => void
 * }} props
 */
export default function DefectLogTable({ rows, onOpen }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No delivered items are flagged with a problem.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table aria-label="Defect log" className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2.5 px-4">PO</th>
            <th className="py-2.5 px-4">Supplier</th>
            <th className="py-2.5 px-4">Part</th>
            <th className="py-2.5 px-4">Reason</th>
            <th className="py-2.5 px-4">Remarks</th>
            <th className="py-2.5 px-4 text-right">PO status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(row => (
            <tr
              key={row.key}
              onClick={() => onOpen(row.po)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <td className="py-3 px-4 font-mono text-xs font-bold">{row.poNumber}</td>
              <td className="py-3 px-4">{row.supplier}</td>
              <td className="py-3 px-4">
                <span className="font-mono text-xs text-muted-foreground mr-1.5">[{row.sku}]</span>{row.name}
              </td>
              <td className="py-3 px-4 font-semibold text-brandRed-700 dark:text-brandRed-300">{row.reason}</td>
              <td className="py-3 px-4 text-muted-foreground">{row.remarks || '—'}</td>
              <td className="py-3 px-4 text-right"><StatusBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
