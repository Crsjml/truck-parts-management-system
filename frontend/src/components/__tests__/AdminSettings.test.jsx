// frontend/src/components/__tests__/AdminSettings.test.jsx
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsContext } from '../../context/SettingsContext';

const updateSettings = vi.fn();
const setOverridePin = vi.fn();

vi.mock('../../authStore', () => ({
  updateSettings: (...a) => updateSettings(...a),
  setOverridePin: (...a) => setOverridePin(...a),
}));

const AdminSettings = (await import('../AdminSettings')).default;

const formatBaseCurrency = (amount) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount);

function Harness({ initialMarkup = 20, onAddLog = () => {}, onClose = () => {}, pinConfigured = false }) {
  const [settings, setSettings] = useState({ base_currency: 'PHP', active_markup: initialMarkup, overridePinConfigured: pinConfigured });
  return (
    <SettingsContext.Provider value={{ settings, setSettings, formatBaseCurrency }}>
      <AdminSettings onClose={onClose} onAddLog={onAddLog} />
    </SettingsContext.Provider>
  );
}

const markupInput = () => screen.getByRole('spinbutton', { name: /markup percentage/i });
const markupSlider = () => screen.getByRole('slider', { name: /markup/i });
const applyButton = () => screen.getByRole('button', { name: /apply markup/i });

describe('AdminSettings — markup', () => {
  beforeEach(() => {
    updateSettings.mockReset();
    setOverridePin.mockReset();
  });

  it('treats slider and number input as a draft that never calls the API', () => {
    render(<Harness />);

    fireEvent.change(markupSlider(), { target: { value: '35' } });
    fireEvent.change(markupInput(), { target: { value: '40' } });

    expect(updateSettings).not.toHaveBeenCalled();
    expect(markupInput()).toHaveValue(40);
    expect(markupSlider()).toHaveValue('40');
    expect(screen.getByTestId('saved-markup')).toHaveTextContent('20%');
  });

  it('shows a worked example of the draft markup', () => {
    render(<Harness />);
    expect(screen.getByText(/₱1,000\.00 cost/)).toBeInTheDocument();
    expect(screen.getByText(/₱1,200\.00 shelf price/)).toBeInTheDocument();

    fireEvent.change(markupInput(), { target: { value: '25' } });
    expect(screen.getByText(/₱1,250\.00 shelf price/)).toBeInTheDocument();
  });

  it('enables Apply markup only when the draft differs from the saved value', () => {
    render(<Harness />);
    expect(applyButton()).toBeDisabled();

    fireEvent.change(markupInput(), { target: { value: '25' } });
    expect(applyButton()).toBeEnabled();

    fireEvent.change(markupInput(), { target: { value: '20' } });
    expect(applyButton()).toBeDisabled();
  });

  it('keeps Apply disabled for values outside 0–100', () => {
    render(<Harness />);
    fireEvent.change(markupInput(), { target: { value: '150' } });
    expect(applyButton()).toBeDisabled();
    expect(screen.getByText(/between 0 and 100/i)).toBeInTheDocument();
  });

  it('asks for a before→after confirmation, and Cancel saves nothing', () => {
    render(<Harness />);
    fireEvent.change(markupInput(), { target: { value: '25' } });
    fireEvent.click(applyButton());

    expect(screen.getByText(/change markup from 20% to 25%\?/i)).toBeInTheDocument();
    expect(screen.getByText(/shelf prices update for everyone as soon as you confirm/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByText(/change markup from/i)).not.toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
    expect(markupInput()).toHaveValue(25);
  });

  it('opens the Apply confirmation on Enter in the percentage field without saving', () => {
    render(<Harness />);
    fireEvent.change(markupInput(), { target: { value: '25' } });
    fireEvent.keyDown(markupInput(), { key: 'Enter' });

    expect(screen.getByText(/change markup from 20% to 25%\?/i)).toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('ignores Enter in the percentage field when the draft is unchanged', () => {
    render(<Harness />);
    fireEvent.keyDown(markupInput(), { key: 'Enter' });
    expect(screen.queryByText(/change markup from/i)).not.toBeInTheDocument();
  });

  it('saves on Confirm, shows Saving… then Saved, and updates the saved value', async () => {
    let resolveSave;
    updateSettings.mockReturnValue(new Promise((r) => { resolveSave = r; }));
    const onAddLog = vi.fn();
    render(<Harness onAddLog={onAddLog} />);

    fireEvent.change(markupInput(), { target: { value: '25' } });
    fireEvent.click(applyButton());
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenCalledWith({ active_markup: 25 });
    const saving = screen.getByRole('button', { name: /saving…/i });
    expect(saving).toBeDisabled();

    resolveSave({ ok: true, settings: { base_currency: 'PHP', active_markup: 25 } });

    await waitFor(() => expect(screen.getByText(/^saved$/i)).toBeInTheDocument());
    expect(screen.getByTestId('saved-markup')).toHaveTextContent('25%');
    expect(applyButton()).toBeDisabled();
    expect(onAddLog).toHaveBeenCalledWith('system', 'Markup rate updated: 20% → 25%');
  });

  it('on failure keeps the draft, shows the error, and does not change the saved value', async () => {
    updateSettings.mockResolvedValue({ ok: false, error: 'Server error updating settings' });
    const onAddLog = vi.fn();
    render(<Harness onAddLog={onAddLog} />);

    fireEvent.change(markupInput(), { target: { value: '25' } });
    fireEvent.click(applyButton());
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/server error updating settings/i));
    expect(screen.getByTestId('saved-markup')).toHaveTextContent('20%');
    expect(markupInput()).toHaveValue(25);
    expect(applyButton()).toBeEnabled();
    expect(onAddLog).not.toHaveBeenCalled();
  });
});

describe('AdminSettings — override PIN', () => {
  const pinInput = () => screen.getByLabelText(/discount override pin/i);
  const confirmInput = () => screen.getByLabelText(/confirm pin/i);
  const setPinButton = () => screen.getByRole('button', { name: /set pin|replace pin/i });

  beforeEach(() => {
    setOverridePin.mockReset();
  });

  it('keeps Set PIN disabled until both fields match a 4–6 digit PIN', () => {
    render(<Harness />);
    fireEvent.change(pinInput(), { target: { value: '1234' } });
    expect(setPinButton()).toBeDisabled();

    fireEvent.change(confirmInput(), { target: { value: '1235' } });
    expect(setPinButton()).toBeDisabled();
    expect(screen.getByText(/pins don’t match/i)).toBeInTheDocument();

    fireEvent.change(confirmInput(), { target: { value: '1234' } });
    expect(setPinButton()).toBeEnabled();
    expect(screen.queryByText(/pins don’t match/i)).not.toBeInTheDocument();
  });

  it('keeps Set PIN disabled for a matching but too-short PIN', () => {
    render(<Harness />);
    fireEvent.change(pinInput(), { target: { value: '12' } });
    fireEvent.change(confirmInput(), { target: { value: '12' } });
    expect(setPinButton()).toBeDisabled();
  });

  it('sends the PIN once both match and clears both fields on success', async () => {
    setOverridePin.mockResolvedValue({ ok: true });
    render(<Harness />);
    fireEvent.change(pinInput(), { target: { value: '4321' } });
    fireEvent.change(confirmInput(), { target: { value: '4321' } });
    fireEvent.click(setPinButton());

    await waitFor(() => expect(screen.getByText(/override pin updated/i)).toBeInTheDocument());
    expect(setOverridePin).toHaveBeenCalledWith('4321');
    expect(pinInput()).toHaveValue('');
    expect(confirmInput()).toHaveValue('');
  });
});

describe('AdminSettings — dialog accessibility', () => {
  it('is a modal dialog named by an h2 title', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog', { name: /system settings/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { level: 2, name: /system settings/i })).toBeInTheDocument();
  });

  it('labels the icon-only close button', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and returns focus to the element that opened it', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);

    expect(screen.getByRole('dialog')).toContainElement(document.activeElement);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('traps Tab focus inside the dialog', () => {
    render(<Harness />);
    const close = screen.getByRole('button', { name: /^close$/i });
    const done = screen.getByRole('button', { name: /^done$/i });

    done.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(done).toHaveFocus();
  });

  it('groups the markup controls under the Global Retail Price Markup heading', () => {
    render(<Harness />);
    const group = screen.getByRole('group', { name: /global retail price markup/i });
    expect(group).toContainElement(markupSlider());
    expect(group).toContainElement(markupInput());
  });

  it('reflects the current PIN status from settings, not a mount-time copy', () => {
    const value = (configured) => ({
      settings: { base_currency: 'PHP', active_markup: 20, overridePinConfigured: configured },
      setSettings: () => {},
      formatBaseCurrency,
    });
    const { rerender } = render(
      <SettingsContext.Provider value={value(false)}><AdminSettings onClose={() => {}} /></SettingsContext.Provider>
    );
    expect(screen.getByText(/discounts are blocked at the pos/i)).toBeInTheDocument();

    rerender(
      <SettingsContext.Provider value={value(true)}><AdminSettings onClose={() => {}} /></SettingsContext.Provider>
    );
    expect(screen.getByText(/a pin is currently set/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /replace pin/i })).toBeInTheDocument();
  });

  it('marks the PIN as set in shared settings after a successful save', async () => {
    setOverridePin.mockResolvedValue({ ok: true });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/discount override pin/i), { target: { value: '4321' } });
    fireEvent.change(screen.getByLabelText(/confirm pin/i), { target: { value: '4321' } });
    fireEvent.click(screen.getByRole('button', { name: /set pin/i }));

    await waitFor(() => expect(screen.getByText(/a pin is currently set/i)).toBeInTheDocument());
  });
});

describe('AdminSettings — hardening', () => {
  beforeEach(() => {
    updateSettings.mockReset();
    setOverridePin.mockReset();
  });

  it('leads with a blocked-discounts alert when no PIN is set', () => {
    render(<Harness pinConfigured={false} />);
    expect(screen.getByText(/discounts are blocked at the pos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /set a pin now/i }));
    expect(screen.getByLabelText(/discount override pin/i)).toHaveFocus();
  });

  it('states the markup consequence only at the confirm step, not as a standing banner', () => {
    render(<Harness />);
    expect(screen.queryByText(/changes apply immediately/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/shelf prices update for everyone/i)).not.toBeInTheDocument();

    fireEvent.change(markupInput(), { target: { value: '35' } });
    fireEvent.click(applyButton());
    expect(screen.getByText(/shelf prices update for everyone as soon as you confirm/i)).toBeInTheDocument();
  });

  it('renders Set a PIN now in foreground text (AA on the red tint), not alarm red', () => {
    render(<Harness pinConfigured={false} />);
    const link = screen.getByRole('button', { name: /set a pin now/i });
    expect(link).toHaveClass('text-foreground');
    expect(link).not.toHaveClass('text-alarm-text');
  });

  it('shows no blocked-discounts alert once a PIN is set', () => {
    render(<Harness pinConfigured />);
    expect(screen.queryByText(/discounts are blocked at the pos/i)).not.toBeInTheDocument();
  });

  it('backs out of only the markup confirmation on Escape, never showing both prompts', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.change(markupInput(), { target: { value: '25' } });
    fireEvent.click(applyButton());
    expect(screen.getByText(/change markup from 20% to 25%\?/i)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText(/change markup from/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/discard unapplied changes\?/i)).not.toBeInTheDocument();
    expect(markupInput()).toHaveValue(25);
    await waitFor(() => expect(markupInput()).toHaveFocus());
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText(/discard unapplied changes\?/i)).toBeInTheDocument();
    expect(screen.queryByText(/change markup from/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('backs out of the markup confirmation from Done as well', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.change(markupInput(), { target: { value: '25' } });
    fireEvent.click(applyButton());
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(screen.queryByText(/change markup from/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/discard unapplied changes\?/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes straight away when nothing is unapplied', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before discarding an unapplied markup draft, and Keep editing keeps it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.change(markupInput(), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/discard unapplied changes\?/i)).toBeInTheDocument();
    const keep = screen.getByRole('button', { name: /keep editing/i });
    expect(keep).toHaveFocus();

    fireEvent.click(keep);
    expect(screen.queryByText(/discard unapplied changes\?/i)).not.toBeInTheDocument();
    expect(markupInput()).toHaveValue(35);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes after Discard is confirmed', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.change(markupInput(), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^discard$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('routes Escape through the same discard check', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/discount override pin/i), { target: { value: '1234' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/discard unapplied changes\?/i)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/discard unapplied changes\?/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('makes Done a secondary action, not a second primary button', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /^done$/i }).className).not.toMatch(/bg-accent/);
  });
});

describe('AdminSettings — screen reader announcements', () => {
  beforeEach(() => {
    updateSettings.mockReset();
    setOverridePin.mockReset();
  });

  it('announces the discard prompt and names what is unapplied', () => {
    render(<Harness />);
    fireEvent.change(markupInput(), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText(/discount override pin/i), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/discard unapplied changes\?/i);
    expect(alert).toHaveTextContent(/markup 35%/i);
    expect(alert).toHaveTextContent(/new pin/i);
    expect(screen.getByRole('button', { name: /keep editing/i }))
      .toHaveAccessibleDescription(/discard unapplied changes\? markup 35%, new pin/i);
  });

  it('lists only what applies in the discard prompt', () => {
    render(<Harness />);
    fireEvent.change(markupInput(), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(screen.getByRole('alert')).not.toHaveTextContent(/pin/i);
  });

  it('describes the dialog with the blocked-discounts alert when no PIN is set', () => {
    render(<Harness pinConfigured={false} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/discounts are blocked at the pos/i);
    expect(markupInput()).toHaveFocus();
  });

  it('has no blocked-discounts description once a PIN is set', () => {
    render(<Harness pinConfigured />);
    expect(screen.getByRole('dialog')).not.toHaveAccessibleDescription(/discounts are blocked/i);
  });

  it('gives the PIN field a visible New PIN label', () => {
    render(<Harness />);
    expect(screen.getByText('New PIN').tagName).toBe('LABEL');
    const pin = screen.getByLabelText(/new pin/i);
    expect(pin).toHaveAttribute('id', 'override-pin');
    expect(screen.getByLabelText(/discount override pin/i)).toBe(pin);
  });

  it('explains why Set PIN is disabled while the PIN is too short or unconfirmed', () => {
    render(<Harness />);
    const pin = screen.getByLabelText(/new pin/i);
    const setPin = screen.getByRole('button', { name: /set pin/i });

    fireEvent.change(pin, { target: { value: '123' } });
    expect(screen.getByText('4–6 digits (3 entered)')).toBeInTheDocument();
    expect(setPin).toHaveAccessibleDescription('4–6 digits (3 entered)');
    expect(pin).toHaveAccessibleDescription(/4–6 digits \(3 entered\)/);

    fireEvent.change(pin, { target: { value: '1234' } });
    expect(setPin).toHaveAccessibleDescription(/re-enter the pin to confirm/i);

    fireEvent.change(screen.getByLabelText(/confirm pin/i), { target: { value: '1234' } });
    expect(setPin).toBeEnabled();
    expect(setPin).not.toHaveAccessibleDescription(/digits|re-enter/i);
  });
});
