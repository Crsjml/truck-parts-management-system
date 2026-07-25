import React from 'react';
import { createPortal } from 'react-dom';
import { X, Percent, WarningCircle } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';

import { updateSettings as saveSettingsApi } from '../authStore';

export default function AdminSettings({ onClose }) {
  const { settings, setSettings } = useSettings();
  
  // Use 1 as a fallback if active_markup is somehow undefined, though it defaults to 0 in some places, 1 means no markup (cost).
  // Wait, in SettingsContext, markupFactor = 1 + (settings.active_markup / 100).
  // Oh, wait! The slider expects a multiplier (1.0 to 2.0). 
  // If active_markup is 20 (meaning 20%), multiplier is 1.20.
  
  const activeMultiplier = 1 + ((settings?.active_markup || 0) / 100);

  const handleMarkupChange = async (e) => {
    const multiplier = parseFloat(e.target.value);
    // Convert multiplier back to percentage for backend (1.20 -> 20)
    const newMarkupPercentage = Math.round((multiplier - 1) * 100);
    
    setSettings({ ...settings, active_markup: newMarkupPercentage });
    await saveSettingsApi({ ...settings, active_markup: newMarkupPercentage });
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
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Global Retail Price Markup
              </label>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Adjusting this multiplier instantly affects the display price for all customer-facing storefront items.
              </p>
            </div>
            
            <div className="bg-background p-4 rounded-xl border border-border space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Active Markup</span>
                <span className="text-lg font-extrabold text-accent">{((activeMultiplier - 1) * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range"
                min="1.0"
                max="2.0"
                step="0.05"
                value={activeMultiplier}
                onChange={handleMarkupChange}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>0% (Cost)</span>
                <span>100% (Double)</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-950/20 border border-amber-900/30">
            <WarningCircle weight="fill" className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p className="text-xs text-amber-500/90 leading-relaxed font-medium">
              Changes apply immediately to all active sessions. Verify before making large adjustments.
            </p>
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
