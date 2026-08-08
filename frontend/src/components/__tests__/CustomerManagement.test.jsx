import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCustomers = vi.fn();
const fetchCustomerTransactions = vi.fn();

vi.mock('../../authStore', () => ({
  fetchCustomers: (...args) => fetchCustomers(...args),
  fetchCustomerTransactions: (...args) => fetchCustomerTransactions(...args),
  mergeCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  updateTransactionStatus: vi.fn()
}));

const CustomerManagement = (await import('../CustomerManagement')).default;

describe('CustomerManagement drawer stats', () => {
  beforeEach(() => {
    fetchCustomers.mockReset();
    fetchCustomerTransactions.mockReset();
  });

  it('shows the header Add Customer action', async () => {
    fetchCustomers.mockResolvedValue({ online: [], ftf: [] });

    render(<CustomerManagement />);

    await screen.findByText('Customer Management');

    expect(screen.getByRole('button', { name: /^Add Customer$/i })).toBeInTheDocument();
  });

  it('uses loaded purchase history totals for drawer total spend and average order', async () => {
    fetchCustomers.mockResolvedValue({
      online: [],
      ftf: [
        {
          id: 'julia_palomo@dlsu.edu.ph',
          authId: 'temp-ftf-julia_palomo@dlsu.edu.ph',
          email: 'julia_palomo@dlsu.edu.ph',
          displayName: 'Julia Kirsten Palomo',
          companyName: '',
          phoneNumber: '324324241',
          orderCount: 1,
          totalSpend: 37436.3,
          lastOrderDate: '2026-08-05T06:56:00.000Z',
          createdAt: '2026-08-05T00:00:00.000Z'
        }
      ]
    });
    fetchCustomerTransactions.mockResolvedValue({
      ok: true,
      online: [],
      ftf: [
        {
          id: 'tx-1',
          invoiceNumber: 'TTP-5780-5893',
          status: 'COMPLETED',
          paymentMethod: 'CASH',
          transactionDate: '2026-08-05T06:56:00.000Z',
          total: 18718.15,
          tax: 12,
          discount: 0,
          processedBy: 'admin@tarlactruckparts.local',
          items: [
            {
              name: 'Air Compressor for Isuzu 6BG1',
              quantity: 1,
              price: 18718.15
            }
          ]
        }
      ]
    });

    render(<CustomerManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Face-to-Face Clients/i }));
    fireEvent.click(await screen.findByText('Julia Kirsten Palomo'));

    await screen.findByText('TTP-5780-5893');

    const totalSpendLabel = screen.getAllByText('Total Spend').at(-1);
    const totalSpendCard = totalSpendLabel.closest('.p-3');
    expect(within(totalSpendCard).getByText('₱18,718.15')).toBeInTheDocument();

    const avgOrderLabel = screen.getByText('Avg. Order');
    const avgOrderCard = avgOrderLabel.closest('.p-3');
    expect(within(avgOrderCard).getByText('₱18,718.15')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchCustomerTransactions).toHaveBeenCalledWith('julia_palomo@dlsu.edu.ph');
    });
  });

  it('renders selection bar when customer checkboxes are selected', async () => {
    fetchCustomers.mockResolvedValue({
      online: [
        {
          id: 'user-1',
          authId: 'auth-1',
          email: 'user1@example.com',
          displayName: 'User One',
          orderCount: 2,
          totalSpend: 5000,
          createdAt: '2026-08-01T00:00:00.000Z'
        }
      ],
      ftf: []
    });

    render(<CustomerManagement />);

    await screen.findByText('User One');

    const selectCheckbox = screen.getByLabelText('Select User One');
    fireEvent.click(selectCheckbox);

    expect(await screen.findByText('1 customer profile(s) selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Selected \(CSV\)/i })).toBeInTheDocument();
  });

  it('displays migration preview card when online account is selected in merge modal', async () => {
    fetchCustomers.mockResolvedValue({
      online: [
        {
          id: 'user-1',
          authId: 'auth-online-1',
          email: 'online@example.com',
          displayName: 'Online Fleet Account',
          orderCount: 5,
          totalSpend: 25000,
          createdAt: '2026-08-01T00:00:00.000Z'
        }
      ],
      ftf: [
        {
          id: 'ftf-1',
          authId: 'temp-ftf-1',
          displayName: 'Walkin Customer',
          email: 'walkin@example.com',
          orderCount: 3,
          totalSpend: 12000,
          lastOrderDate: '2026-08-05T00:00:00.000Z'
        }
      ]
    });

    render(<CustomerManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Face-to-Face Clients/i }));

    const linkButton = await screen.findByRole('button', { name: /Link customer Walkin Customer to an online account/i });
    fireEvent.click(linkButton);

    expect(await screen.findByText('Link to Online Account')).toBeInTheDocument();

    const accountSelect = screen.getByRole('combobox');
    fireEvent.change(accountSelect, { target: { value: 'auth-online-1' } });

    expect(await screen.findByText(/Migration Preview/i)).toBeInTheDocument();
    expect(screen.getByText('Online Fleet Account')).toBeInTheDocument();
  });
});
