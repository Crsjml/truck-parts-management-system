import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Percent, WarningCircle, Lock } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { useDialogFocus } from '../hooks/useDialogFocus';

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
  const dialogRef = useRef(null);
  const keepEditingRef = useRef(null);
  const doneRef = useRef(null);
  const wasConfirmingDiscard = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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
  // Derived, not copied into state: the settings can load (or change) after mount.
  const pinConfigured = Boolean(settings?.overridePinConfigured);

  // Closing must never silently drop a markup draft or a half-typed PIN.
  const hasUnappliedChanges = isDraftDirty || newPin !== '' || confirmPin !== '';

  const requestClose = () => {
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return;
    }
    if (hasUnappliedChanges && !isMarkupSaving && !pinSaving) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  useDialogFocus(dialogRef, { onClose: requestClose, initialFocus: '#markup-percent' });

  // Focus follows the footer swap: into the prompt, then back to Done.
  useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus();
    else if (wasConfirmingDiscard.current) doneRef.current?.focus();
    wasConfirmingDiscard.current = confirmDiscard;
  }, [confirmDiscard]);

  const focusPinField = () => dialogRef.current?.querySelector('#override-pin')?.focus();

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
      setSettings((prev) => ({ ...prev, overridePinConfigured: true }));
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-settings-title"
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col bg-secondary border border-border rounded-xl overflow-hidden motion-safe:animate-scaleUp"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between p-5 border-b border-border">
          <h2 id="system-settings-title" className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Percent weight="duotone" aria-hidden="true" className="w-5 h-5 text-accent" /> System Settings
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X weight="duotone" aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 overflow-y-auto p-6 space-y-6">
          {!pinConfigured && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border bg-destructive/10">
              <Lock weight="fill" aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-alarm-text" />
              <p className="text-sm leading-relaxed text-foreground">
                <span className="font-bold">Discounts are blocked at the POS</span> until a Discount Override PIN is set.{' '}
                <button
                  type="button"
                  onClick={focusPinField}
                  className="font-semibold text-alarm-text underline underline-offset-2 hover:no-underline"
                >
                  Set a PIN now
                </button>
              </p>
            </div>
          )}

          {/* Shown before the markup control: an applied markup reprices the
              live storefront at once, so this is read before adjusting. */}
          <div
            role="note"
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border bg-amber-500/10"
          >
            <WarningCircle weight="fill" aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200">
              <span className="font-bold">Changes apply immediately</span> to all active sessions. Verify before making large adjustments.
            </p>
          </div>

          <section
            role="group"
            aria-labelledby="markup-heading"
            aria-describedby="markup-help"
            className="space-y-4"
          >
            <div>
              <h3 id="markup-heading" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Global Retail Price Markup
              </h3>
              <p id="markup-help" className="text-sm text-muted-foreground leading-relaxed">
                Sets the display price for all customer-facing storefront items. Nothing changes until you apply it.
              </p>
            </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Active Markup</span>
                <span data-testid="saved-markup" className="text-lg font-extrabold text-accent tabular-nums">{savedMarkup}%</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  aria-label="Markup slider"
                  aria-valuetext={`${sliderValue}%`}
                  min={MARKUP_MIN}
                  max={MARKUP_MAX}
                  step="1"
                  value={sliderValue}
                  onChange={handleDraftChange}
                  disabled={isMarkupSaving}
                  className="flex-1 min-w-0 h-2 bg-muted-foreground/30 rounded-lg appearance-none cursor-pointer accent-accent disabled:cursor-not-allowed"
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
                    className="w-20 bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold text-right tabular-nums text-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                  <span className="text-sm font-semibold text-muted-foreground" aria-hidden="true">%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>0% (Cost)</span>
                <span>100% (Double)</span>
              </div>

              <p id="markup-example" className={`text-sm tabular-nums ${isDraftValid ? 'text-foreground' : 'text-alarm-text font-semibold'}`}>
                {isDraftValid
                  ? `${formatMoney(EXAMPLE_COST)} cost → ${formatMoney(EXAMPLE_COST * (1 + draftValue / 100))} shelf price`
                  : `Enter a whole number between ${MARKUP_MIN} and ${MARKUP_MAX}.`}
              </p>

              {markupStatus === 'confirming' || isMarkupSaving ? (
                <div className="rounded-xl border border-border bg-background p-3 space-y-3">
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
                <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Saved</p>
              )}
              {markupStatus === 'error' && (
                <p role="alert" className="text-xs font-semibold text-alarm-text">{markupError}</p>
              )}
          </section>

          <section className="space-y-4 pt-6 border-t border-border">
            <div>
              <h3 id="pin-heading" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Lock weight="duotone" aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                <label htmlFor="override-pin">Discount Override PIN</label>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Staff must enter this PIN at the POS before any discount is applied.{' '}
                {pinConfigured
                  ? 'A PIN is currently set.'
                  : 'No PIN is set yet — discounts stay blocked until one is.'}
              </p>
            </div>

            <div className="space-y-3">
              <input
                id="override-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                placeholder="Enter a 4–6 digit PIN"
                value={newPin}
                onChange={handlePinInput(setNewPin)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
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
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                />
                {isPinMismatch && (
                  <p id="override-pin-mismatch" className="text-xs font-semibold text-alarm-text">
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
                <p role="status" className={`text-xs font-semibold ${pinError ? 'text-alarm-text' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {pinMessage}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 p-5 border-t border-border bg-background/50">
          {confirmDiscard ? (
            <>
              <p className="mr-auto text-sm font-semibold text-foreground">Discard unapplied changes?</p>
              <button
                ref={keepEditingRef}
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-alarm-solid hover:bg-alarm-solid/90 text-white text-sm font-bold transition-colors"
              >
                Discard
              </button>
            </>
          ) : (
            <button
              ref={doneRef}
              type="button"
              onClick={requestClose}
              className="px-5 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
