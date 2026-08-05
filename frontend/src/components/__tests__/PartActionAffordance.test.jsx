import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PartTableRow from '../PartTableRow';
import PartCard from '../PartCard';

vi.mock('../../utils/categoryIcons', () => ({
  getCategoryPlaceholder: () => '',
  getCategoryIconAndColor: () => ({ Icon: () => null, color: '', bg: '' })
}));

const rowPart = {
  id: 'part-1',
  name: 'Air Compressor',
  sku: 'SKU-123',
  oem: 'OEM-456',
  category: 'Engine',
  price: 1500,
  stock: 3,
  minStock: 5,
  image: '',
  compatibility: ''
};

describe('Part action affordances', () => {
  it('keeps primary row actions visible without hover dependence', () => {
    render(
      <table>
        <tbody>
          <PartTableRow
            part={rowPart}
            openDetailsModal={vi.fn()}
            formatCurrency={(value) => `₱${value}`}
            formatBaseCurrency={(value) => `₱${value}`}
            openAdjustStockModal={vi.fn()}
            openEditModal={vi.fn()}
            onDeletePart={vi.fn()}
            setPage={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByRole('button', { name: /create po for air compressor/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /adjust stock count/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^edit part$/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /archive part/i })).toBeVisible();
    expect(screen.queryByText(/wholesale/i)).not.toBeInTheDocument();
  });

  it('keeps the compact card actions visible without hover dependence', () => {
    render(
      <PartCard
        part={rowPart}
        isReadOnly={false}
        isAdmin={true}
        formatCurrency={(value) => `₱${value}`}
        formatBaseCurrency={(value) => `₱${value}`}
        openDetailsModal={vi.fn()}
        setInquiryPart={vi.fn()}
        setInquiryQty={vi.fn()}
        setInquiryMsg={vi.fn()}
        setIsInquiryModalOpen={vi.fn()}
        setPage={vi.fn()}
        openAdjustStockModal={vi.fn()}
        openEditModal={vi.fn()}
        onDeletePart={vi.fn()}
        viewMode="grid3"
      />
    );

    expect(screen.getByRole('button', { name: /create po/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /adjust stock/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /edit air compressor/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /archive/i })).toBeVisible();
    expect(screen.queryByText(/wholesale/i)).not.toBeInTheDocument();
  });
});
