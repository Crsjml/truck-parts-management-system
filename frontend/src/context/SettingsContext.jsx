import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings, updateSettings } from '../authStore';
import { fetchExchangeRates } from '../utils/currency_api';

const defaultSettingsContext = {
  settings: { base_currency: 'PHP', active_markup: 0 },
  displayCurrency: 'PHP',
  markupFactor: 1,
  getMarkupFactor: () => 1,
  formatCurrency: (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0),
  formatCompactCurrency: (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0),
  formatBaseCurrency: (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0),
  loading: false,
};

export const SettingsContext = createContext(defaultSettingsContext);

export const useSettings = () => useContext(SettingsContext) || defaultSettingsContext;

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({ base_currency: 'PHP', active_markup: 0 });
  const [displayCurrency, setDisplayCurrency] = useState('PHP');
  const [exchangeRates, setExchangeRates] = useState({ PHP: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      // Fetch backend settings
      const data = await fetchSettings();
      if (data) {
        setSettings({
          base_currency: data.base_currency || 'PHP',
          active_markup: data.active_markup || 0,
        });
        // Default display currency to base currency
        setDisplayCurrency(data.base_currency || 'PHP');
      }

      // Fetch live exchange rates
      const rates = await fetchExchangeRates();
      if (rates) {
        setExchangeRates(rates);
      }
      setLoading(false);
    };

    loadSettings();
  }, []);

  // Resolves the markup to apply for a given part: a part-level
  // markupOverride takes precedence over the global active_markup.
  // Pass no part (or a part with no override) to fall back to the global rate.
  const getMarkupFactor = (part) => {
    const override = part?.markupOverride;
    const percent = (override !== undefined && override !== null) ? override : (settings.active_markup || 0);
    return 1 + (percent / 100);
  };

  const formatCurrency = (amount, part) => {
    // 1. Apply markup (part override, else global)
    const markupFactor = getMarkupFactor(part);
    let finalAmount = amount * markupFactor;

    // 2. Convert from Base Currency to Display Currency
    // Rates are based on PHP = 1 if using exchangerate-api for PHP
    // If base is PHP, then rate for PHP is 1. rate for USD is e.g. 0.017.
    // Converted = Amount * (targetRate / baseRate)
    const baseRate = exchangeRates[settings.base_currency] || 1;
    const targetRate = exchangeRates[displayCurrency] || 1;
    finalAmount = finalAmount * (targetRate / baseRate);

    // 3. Format using Intl
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: 2,
    }).format(finalAmount);
  };

  const formatCompactCurrency = (amount, part) => {
    const markupFactor = getMarkupFactor(part);
    let finalAmount = amount * markupFactor;
    const baseRate = exchangeRates[settings.base_currency] || 1;
    const targetRate = exchangeRates[displayCurrency] || 1;
    finalAmount = finalAmount * (targetRate / baseRate);

    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: displayCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(finalAmount);
  };

  const formatBaseCurrency = (amount) => {
    let finalAmount = amount;
    const baseRate = exchangeRates[settings.base_currency] || 1;
    const targetRate = exchangeRates[displayCurrency] || 1;
    finalAmount = finalAmount * (targetRate / baseRate);

    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: 2,
    }).format(finalAmount);
  };

  const formatCompactBaseCurrency = (amount) => {
    let finalAmount = amount;
    const baseRate = exchangeRates[settings.base_currency] || 1;
    const targetRate = exchangeRates[displayCurrency] || 1;
    finalAmount = finalAmount * (targetRate / baseRate);

    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: displayCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(finalAmount);
  };

  const toggleDisplayCurrency = (currencyCode) => {
    setDisplayCurrency(currencyCode);
  };

  const markupFactor = 1 + ((settings.active_markup || 0) / 100);

  return (
    <SettingsContext.Provider value={{
      settings,
      setSettings,
      displayCurrency,
      markupFactor,
      getMarkupFactor,
      toggleDisplayCurrency,
      formatCurrency,
      formatCompactCurrency,
      formatBaseCurrency,
      formatCompactBaseCurrency,
      loading
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
