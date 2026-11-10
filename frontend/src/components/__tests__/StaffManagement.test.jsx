// frontend/src/components/__tests__/StaffManagement.test.jsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('opens outside the animated page and restores focus and scrolling on Escape', async () => {
    fetchStaffRoles.mockResolvedValue({ ok: true, status: 200, staff: [] });
    const { container } = render(<StaffManagement currentEmail="a@ttp.com" />);
    const trigger = await screen.findByRole('button', { name: /add staff member/i });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /add staff member/i });
    expect(document.body).toContainElement(dialog);
    expect(container).not.toContainElement(dialog);
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('lets a superadmin add warehouse staff with a visible access description', async () => {
    fetchStaffRoles.mockResolvedValue({ ok: true, status: 200, staff: [] });
    createStaffRole.mockResolvedValue({ ok: true });
    render(<StaffManagement currentEmail="owner@ttp.com" />);
    fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
    expect(screen.getByLabelText('Role')).toHaveValue('CASHIER');
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'WAREHOUSE' } });
    expect(screen.getByText('Parts inventory, categories and purchasing')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'warehouse@ttp.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^add member$/i }));
    await waitFor(() => expect(createStaffRole).toHaveBeenCalledWith({ email: 'warehouse@ttp.com', role: 'WAREHOUSE' }));
  });

  describe('roster safety and usability', () => {
    const roster = [
      { id: 'a', email: 'owner@ttp.com', role: 'SUPERADMIN', lastSeenAt: new Date().toISOString(), addedBy: 'system' },
      { id: 'b', email: 'clerk@ttp.com', role: 'CASHIER', lastSeenAt: null, addedBy: 'owner@ttp.com' }
    ];

    beforeEach(() => {
      fetchStaffRoles.mockResolvedValue({ ok: true, status: 200, staff: roster });
      updateStaffRole.mockReset().mockResolvedValue({ ok: true });
      createStaffRole.mockReset().mockResolvedValue({ ok: true });
    });

    it('recognises your own row regardless of email letter case', async () => {
      render(<StaffManagement currentEmail="Owner@TTP.com" />);

      expect(await screen.findByText(/superadmin · you/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Role for owner@ttp.com')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove owner@ttp.com' })).not.toBeInTheDocument();
    });

    it('keeps the roster on screen (no full-page spinner) while a role change saves', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      const roleSelect = await screen.findByLabelText('Role for clerk@ttp.com');
      fetchStaffRoles.mockReturnValueOnce(new Promise(() => {})); // the refresh never settles
      fireEvent.change(roleSelect, { target: { value: 'WAREHOUSE' } });

      await waitFor(() => expect(fetchStaffRoles).toHaveBeenCalledTimes(2));
      expect(updateStaffRole).toHaveBeenCalledWith('b', 'WAREHOUSE');
      expect(screen.queryByText(/loading staff records/i)).not.toBeInTheDocument();
      expect(screen.getByText('clerk@ttp.com')).toBeInTheDocument();
    });

    it('asks for confirmation before promoting someone to Superadmin', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.change(await screen.findByLabelText('Role for clerk@ttp.com'), { target: { value: 'SUPERADMIN' } });

      expect(updateStaffRole).not.toHaveBeenCalled();
      expect(screen.getByText(/make clerk@ttp.com a superadmin/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^make superadmin$/i }));

      await waitFor(() => expect(updateStaffRole).toHaveBeenCalledWith('b', 'SUPERADMIN'));
    });

    it('can cancel a Superadmin promotion', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.change(await screen.findByLabelText('Role for clerk@ttp.com'), { target: { value: 'SUPERADMIN' } });
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(updateStaffRole).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Role for clerk@ttp.com')).toHaveValue('CASHIER');
    });

    it('moves focus to Cancel when a promote confirmation appears, and back to the role control after Cancel', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.change(await screen.findByLabelText('Role for clerk@ttp.com'), { target: { value: 'SUPERADMIN' } });

      await waitFor(() => expect(screen.getByRole('button', { name: /^cancel$/i })).toHaveFocus());
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      await waitFor(() => expect(screen.getByLabelText('Role for clerk@ttp.com')).toHaveFocus());
    });

    it('returns focus to the role control after confirming a promotion', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.change(await screen.findByLabelText('Role for clerk@ttp.com'), { target: { value: 'SUPERADMIN' } });
      fireEvent.click(screen.getByRole('button', { name: /^make superadmin$/i }));

      await waitFor(() => expect(screen.getByLabelText('Role for clerk@ttp.com')).toHaveFocus());
    });

    it('moves focus to Cancel for a remove confirmation and back to the remove button after Cancel', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: 'Remove clerk@ttp.com' }));

      await waitFor(() => expect(screen.getByRole('button', { name: /^cancel$/i })).toHaveFocus());
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Remove clerk@ttp.com' })).toHaveFocus());
    });

    it('keeps focus in the staff list after a confirmed removal', async () => {
      deleteStaffRole.mockReset().mockResolvedValue({ ok: true });
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: 'Remove clerk@ttp.com' }));
      fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

      await waitFor(() => expect(deleteStaffRole).toHaveBeenCalledWith('b'));
      await waitFor(() => expect(screen.getByRole('list', { name: /staff members/i })).toHaveFocus());
    });

    it('after adding, keeps the dialog open with exact sign-in steps for that email', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'New.Hire@ttp.com' } });
      fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'WAREHOUSE' } });
      fireEvent.click(screen.getByRole('button', { name: /^add member$/i }));

      const dialog = await screen.findByRole('dialog');
      expect(await screen.findByRole('heading', { name: /new\.hire@ttp\.com can now sign in/i })).toBeInTheDocument();
      const steps = screen.getByRole('list', { name: /sign-in steps/i });
      expect(steps).toHaveTextContent(window.location.origin);
      expect(steps).toHaveTextContent(/register/i);
      expect(steps).toHaveTextContent('New.Hire@ttp.com');
      expect(dialog).toHaveTextContent(/warehouse/i);
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    });

    it('copies the sign-in steps to the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'new@ttp.com' } });
      fireEvent.click(screen.getByRole('button', { name: /^add member$/i }));

      fireEvent.click(await screen.findByRole('button', { name: /copy sign-in steps/i }));
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      expect(writeText.mock.calls[0][0]).toContain('new@ttp.com');
      expect(writeText.mock.calls[0][0]).toContain(window.location.origin);
      expect(await screen.findByRole('button', { name: /copied/i })).toBeInTheDocument();
    });

    it('can add another member from the success panel', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'new@ttp.com' } });
      fireEvent.click(screen.getByRole('button', { name: /^add member$/i }));

      fireEvent.click(await screen.findByRole('button', { name: /add another/i }));
      expect(screen.getByLabelText(/email address/i)).toHaveValue('');
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    });

    it('says no invitation is sent and points to Register, not a "normal flow"', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent(/no invitation is sent/i);
      expect(dialog).toHaveTextContent(/register/i);
      expect(dialog).not.toHaveTextContent(/normal flow/i);
    });

    it('rejects a malformed email in the add dialog without calling the server', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'not-an-email' } });
      fireEvent.click(screen.getByRole('button', { name: /^add member$/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
      expect(createStaffRole).not.toHaveBeenCalled();
    });

    it('submits the add dialog with the Enter key', async () => {
      render(<StaffManagement currentEmail="owner@ttp.com" />);
      fireEvent.click(await screen.findByRole('button', { name: /add staff member/i }));
      const email = screen.getByLabelText(/email address/i);
      fireEvent.change(email, { target: { value: 'new@ttp.com' } });
      fireEvent.submit(email.closest('form'));

      await waitFor(() => expect(createStaffRole).toHaveBeenCalledWith({ email: 'new@ttp.com', role: 'CASHIER' }));
    });
  });
});
