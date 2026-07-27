// frontend/src/components/__tests__/StaffManagement.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchStaffRoles = vi.fn();
const createStaffRole = vi.fn();
const updateStaffRole = vi.fn();
const deleteStaffRole = vi.fn();

vi.mock('../../authStore', () => ({
  fetchStaffRoles: (...a) => fetchStaffRoles(...a),
  createStaffRole: (...a) => createStaffRole(...a),
  updateStaffRole: (...a) => updateStaffRole(...a),
  deleteStaffRole: (...a) => deleteStaffRole(...a)
}));

const StaffManagement = (await import('../StaffManagement')).default;

describe('StaffManagement', () => {
  beforeEach(() => {
    fetchStaffRoles.mockReset();
  });

  it('shows a denied message on 403 rather than an empty list', async () => {
    fetchStaffRoles.mockResolvedValue({ ok: false, status: 403, staff: [] });
    render(<StaffManagement currentEmail="a@ttp.com" />);

    await waitFor(() => expect(screen.getByText(/superadmin access/i)).toBeInTheDocument());
    expect(screen.queryByText(/no staff members/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when the list is genuinely empty', async () => {
    fetchStaffRoles.mockResolvedValue({ ok: true, status: 200, staff: [] });
    render(<StaffManagement currentEmail="a@ttp.com" />);

    await waitFor(() => expect(screen.getByText(/no staff members/i)).toBeInTheDocument());
  });

  it('renders the roster when staff exist', async () => {
    fetchStaffRoles.mockResolvedValue({
      ok: true,
      status: 200,
      staff: [{ id: 's1', email: 'owner@ttp.com', role: 'SUPERADMIN', lastSeenAt: null, addedBy: 'system', createdAt: new Date().toISOString() }]
    });
    render(<StaffManagement currentEmail="owner@ttp.com" />);

    await waitFor(() => expect(screen.getByText('owner@ttp.com')).toBeInTheDocument());
  });

  it('shows a connection error when the request fails outright', async () => {
    fetchStaffRoles.mockResolvedValue({ ok: false, status: 0, staff: [] });
    render(<StaffManagement currentEmail="a@ttp.com" />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not reach/i));
  });
});
