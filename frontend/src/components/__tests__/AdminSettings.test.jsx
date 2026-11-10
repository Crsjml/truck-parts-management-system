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

function Harness({ initialMarkup = 20, onAddLog = () => {} }) {
  const [settings, setSettings] = useState({ base_currency: 'PHP', active_markup: initialMarkup });
  return (
    <SettingsContext.Provider value={{ settings, setSettings, formatBaseCurrency }}>
      <AdminSettings onClose={() => {}} onAddLog={onAddLog} />
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
    expect(screen.getByText(/all shelf prices update immediately/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByText(/change markup from/i)).not.toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
    expect(markupInput()).toHaveValue(25);
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
