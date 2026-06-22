import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings, updateSettings } from '../authStore';
import { fetchExchangeRates } from '../utils/currency_api';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

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

  const formatCurrency = (amount) => {
    // 1. Apply global markup
    const markupFactor = 1 + (settings.active_markup / 100);
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

  const toggleDisplayCurrency = (currencyCode) => {
    setDisplayCurrency(currencyCode);
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      setSettings,
      displayCurrency,
      toggleDisplayCurrency,
      formatCurrency,
      loading
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
