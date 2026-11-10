import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Percent, WarningCircle, Lock } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';

import { updateSettings as saveSettingsApi, setOverridePin } from '../authStore';

const MARKUP_MIN = 0;
const MARKUP_MAX = 100;
const EXAMPLE_COST = 1000;
const PIN_PATTERN = /^\d{4,6}$/;

const fallbackFormat = (amount) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0);

function parseMarkup(text) {
  if (String(text).trim() === '') return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < MARKUP_MIN || value > MARKUP_MAX) return null;
  return value;
}

export default function AdminSettings({ onClose, onAddLog }) {
  const { settings, setSettings, formatBaseCurrency } = useSettings();
  const formatMoney = formatBaseCurrency || fallbackFormat;

  const savedMarkup = settings?.active_markup ?? 0;
  const [markupDraft, setMarkupDraft] = useState(String(savedMarkup));
  // idle | confirming | saving | saved | error
  const [markupStatus, setMarkupStatus] = useState('idle');
  const [markupError, setMarkupError] = useState('');

  const draftValue = parseMarkup(markupDraft);
  const isDraftValid = draftValue !== null;
  const isDraftDirty = isDraftValid && draftValue !== savedMarkup;
  const isMarkupSaving = markupStatus === 'saving';
  const sliderValue = isDraftValid ? draftValue : savedMarkup;

  const handleDraftChange = (e) => {
    setMarkupDraft(e.target.value);
    setMarkupStatus('idle');
    setMarkupError('');
  };

  const handleConfirmMarkup = async () => {
    if (!isDraftDirty) return;
    const previous = savedMarkup;
    setMarkupStatus('saving');
    setMarkupError('');

    const result = await saveSettingsApi({ active_markup: draftValue });

    if (!result?.ok) {
      setMarkupStatus('error');
      setMarkupError(result?.error || 'Could not save the markup. Nothing was changed.');
      return;
    }

    const applied = result.settings?.active_markup ?? draftValue;
    setSettings((prev) => ({ ...prev, active_markup: applied }));
    setMarkupDraft(String(applied));
    setMarkupStatus('saved');
    if (onAddLog) onAddLog('system', `Markup rate updated: ${previous}% → ${applied}%`);
  };

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(Boolean(settings?.overridePinConfigured));

  const isPinMismatch = confirmPin.length > 0 && confirmPin.length >= newPin.length && confirmPin !== newPin;
  const canSavePin = PIN_PATTERN.test(newPin) && newPin === confirmPin && !pinSaving;

  const handlePinInput = (setter) => (e) => {
    setter(e.target.value.replace(/\D/g, ''));
    setPinMessage('');
  };

  const handleSavePin = async () => {
    if (!canSavePin) return;
    setPinSaving(true);
    setPinMessage('');

    const result = await setOverridePin(newPin);

    if (result.ok) {
      setPinError(false);
      setPinMessage('Override PIN updated.');
      setPinConfigured(true);
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinError(true);
      setPinMessage(result.error);
    }
    setPinSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Percent weight="duotone" className="w-5 h-5 text-accent" /> System Settings
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X weight="duotone" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Shown before the markup control: an applied markup reprices the
              live storefront at once, so this is read before adjusting. */}
          <div
            role="note"
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10"
          >
            <WarningCircle weight="fill" aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200">
              <span className="font-bold">Changes apply immediately</span> to all active sessions. Verify before making large adjustments.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="markup-percent" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Global Retail Price Markup
              </label>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Sets the display price for all customer-facing storefront items. Nothing changes until you apply it.
              </p>
            </div>
            
            <div className="bg-background p-4 rounded-xl border border-border space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Active Markup</span>
                <span data-testid="saved-markup" className="text-lg font-extrabold text-accent tabular-nums">{savedMarkup}%</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  aria-label="Markup"
                  aria-valuetext={`${sliderValue}%`}
                  min={MARKUP_MIN}
                  max={MARKUP_MAX}
                  step="1"
                  value={sliderValue}
                  onChange={handleDraftChange}
                  disabled={isMarkupSaving}
                  className="flex-1 min-w-0 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent disabled:cursor-not-allowed"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    id="markup-percent"
                    type="number"
                    inputMode="numeric"
                    aria-label="Markup percentage"
                    aria-invalid={!isDraftValid}
                    aria-describedby="markup-example"
                    min={MARKUP_MIN}
                    max={MARKUP_MAX}
                    step="1"
                    value={markupDraft}
                    onChange={handleDraftChange}
                    disabled={isMarkupSaving}
                    className="w-20 bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-semibold text-right tabular-nums text-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                  <span className="text-sm font-semibold text-muted-foreground" aria-hidden="true">%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>0% (Cost)</span>
                <span>100% (Double)</span>
              </div>

              <p id="markup-example" className={`text-sm tabular-nums ${isDraftValid ? 'text-foreground' : 'text-red-500 font-semibold'}`}>
                {isDraftValid
                  ? `${formatMoney(EXAMPLE_COST)} cost → ${formatMoney(EXAMPLE_COST * (1 + draftValue / 100))} shelf price`
                  : `Enter a whole number between ${MARKUP_MIN} and ${MARKUP_MAX}.`}
              </p>

              {markupStatus === 'confirming' || isMarkupSaving ? (
                <div className="rounded-xl border border-border bg-secondary p-3 space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-bold">Change markup from {savedMarkup}% to {draftValue}%?</span>{' '}
                    All shelf prices update immediately.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMarkupStatus('idle')}
                      disabled={isMarkupSaving}
                      className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmMarkup}
                      disabled={isMarkupSaving}
                      className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {isMarkupSaving ? 'Saving…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMarkupStatus('confirming')}
                  disabled={!isDraftDirty}
                  className="w-full px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Apply markup
                </button>
              )}

              {markupStatus === 'saved' && (
                <p role="status" className="text-xs font-semibold text-emerald-500">Saved</p>
              )}
              {markupStatus === 'error' && (
                <p role="alert" className="text-xs font-semibold text-red-500">{markupError}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <label htmlFor="override-pin" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Lock weight="duotone" className="w-3.5 h-3.5 text-accent" /> Discount Override PIN
              </label>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Staff must enter this PIN at the POS before any discount is applied.{' '}
                {pinConfigured
                  ? 'A PIN is currently set.'
                  : 'No PIN is set yet — discounts stay blocked until one is.'}
              </p>
            </div>

            <div className="bg-background p-4 rounded-xl border border-border space-y-3">
              <input
                id="override-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                placeholder="Enter a 4–6 digit PIN"
                value={newPin}
                onChange={handlePinInput(setNewPin)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
              />

              <div className="space-y-1.5">
                <label htmlFor="override-pin-confirm" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Confirm PIN
                </label>
                <input
                  id="override-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  placeholder="Re-enter the PIN"
                  value={confirmPin}
                  onChange={handlePinInput(setConfirmPin)}
                  aria-invalid={isPinMismatch}
                  aria-describedby={isPinMismatch ? 'override-pin-mismatch' : undefined}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
                />
                {isPinMismatch && (
                  <p id="override-pin-mismatch" className="text-xs font-semibold text-red-500">
                    PINs don’t match. Re-enter the same 4–6 digits in both fields.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSavePin}
                disabled={!canSavePin}
                className="w-full px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {pinSaving ? 'Saving…' : pinConfigured ? 'Replace PIN' : 'Set PIN'}
              </button>

              {pinMessage && (
                <p role="status" className={`text-xs font-semibold ${pinError ? 'text-red-500' : 'text-emerald-500'}`}>
                  {pinMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-5 border-t border-border bg-background/50">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
