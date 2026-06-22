import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Gear, X } from '@phosphor-icons/react';

const FloatingSettingsWidget = ({ onAdminLogin, onCustomerLogin, onLogout, isLoggedIn }) => {
  const { displayCurrency, toggleDisplayCurrency } = useSettings();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isOpen, setIsOpen] = useState(false);

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleCurrencyChange = (e) => {
    toggleDisplayCurrency(e.target.value);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white p-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105 transition-all duration-300 z-[100] flex items-center justify-center border border-white/10 group"
      >
        <Gear weight="duotone" className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-8 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[100] flex flex-col gap-4 w-72 animate-scaleUp">
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          Testing Tools
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-1.5 rounded-lg"
        >
          <X weight="bold" className="w-4 h-4" />
        </button>
      </div>
      
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white transition-colors"
      >
        <span>App Theme</span>
        <span className="capitalize px-2 py-1 bg-white dark:bg-slate-800 rounded-md text-xs shadow-sm">{theme}</span>
      </button>

      {/* Currency Selector */}
      <div className="flex flex-col gap-1.5 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Display Currency</label>
        <select 
          value={displayCurrency} 
          onChange={handleCurrencyChange}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-semibold text-sm rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-red-500 transition-colors"
        >
          <option value="PHP">PHP (₱)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="JPY">JPY (¥)</option>
        </select>
      </div>

      <hr className="border-slate-200 dark:border-slate-700 my-1" />

      {/* Quick Auth Buttons */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Auth Jump</label>
        {isLoggedIn ? (
          <button 
            type="button"
            onClick={onLogout}
            className="w-full bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-red-200 dark:border-red-800"
          >
            Logout Current Session
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onAdminLogin}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-600 dark:hover:bg-slate-500 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex flex-col items-center justify-center leading-tight"
            >
              <span>Auto-Login</span>
              <span className="text-[9px] font-medium opacity-80">(Admin)</span>
            </button>
            <button 
              type="button"
              onClick={onCustomerLogin}
              className="flex-1 bg-brandBlue-100 hover:bg-brandBlue-200 text-brandBlue-700 dark:bg-brandBlue-900/30 dark:text-brandBlue-400 dark:hover:bg-brandBlue-900/50 py-2.5 rounded-xl text-xs font-bold transition-all border border-brandBlue-200 dark:border-brandBlue-800 flex flex-col items-center justify-center leading-tight shadow-sm hover:shadow"
            >
              <span>Auto-Login</span>
              <span className="text-[9px] font-medium opacity-80">(Messi)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingSettingsWidget;
