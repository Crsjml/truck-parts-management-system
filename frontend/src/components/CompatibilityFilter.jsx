import React, { useState, useEffect } from 'react';
import { fetchVehicleOptions } from '../authStore';
import { Truck, CarProfile } from '@phosphor-icons/react';
import Select from 'react-select';

export default function CompatibilityFilter({ onFilterChange }) {
  const [options, setOptions] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedSeries, setSelectedSeries] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      const data = await fetchVehicleOptions();
      setOptions(data);
      setLoading(false);
    }
    loadOptions();
  }, []);

  const handleBrandChange = (e) => {
    const brand = e.target.value;
    setSelectedBrand(brand);
    setSelectedSeries('All'); // Reset series when brand changes
    
    onFilterChange({
      brand: brand === 'All' ? null : brand,
      series: null
    });
  };

  const handleSeriesChange = (e) => {
    const series = e.target.value;
    setSelectedSeries(series);
    
    onFilterChange({
      brand: selectedBrand === 'All' ? null : selectedBrand,
      series: series === 'All' ? null : series
    });
  };

  const currentSeriesOptions = selectedBrand === 'All'
    ? [...new Set(options.flatMap(o => o.series))].sort()
    : options.find(o => o.brand === selectedBrand)?.series || [];

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-background/60 rounded-2xl border border-border backdrop-blur-sm animate-pulse">
        <div className="w-24 h-5 bg-border rounded"></div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-9 bg-border rounded-lg"></div>
          <div className="h-9 bg-border rounded-lg"></div>
        </div>
      </div>
    );
  }

  // React-Select dark mode styles matching token system
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))',
      borderRadius: '0.75rem',
      padding: '0px',
      minHeight: '36px',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--accent) / 0.2)' : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--border))'
      },
      transition: 'all 0.15s ease'
    }),
    menu: (base) => ({
      ...base,
      background: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      zIndex: 50,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--accent) / 0.1)' 
        : state.isFocused 
          ? 'hsl(var(--secondary))' 
          : 'transparent',
      color: state.isSelected ? 'hsl(var(--accent))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '8px 12px',
      ':active': {
        backgroundColor: 'hsl(var(--accent) / 0.2)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }),
    indicatorSeparator: () => ({ display: 'none' })
  };

  const getBrandColor = (brand) => {
    const colors = {
      'Isuzu': 'bg-blue-500 text-white',
      'Mitsubishi': 'bg-red-500 text-white',
      'Fuso': 'bg-red-500 text-white',
      'Toyota': 'bg-slate-700 text-white',
      'Nissan': 'bg-gray-500 text-white',
      'Hino': 'bg-green-600 text-white'
    };
    return colors[brand] || 'bg-brandBlue-500 text-white';
  };

  const formatBrandOption = (option) => (
    <div className="flex items-center gap-2">
      {option.value !== 'All' ? (
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${getBrandColor(option.value)}`}>
          {option.value.charAt(0)}
        </span>
      ) : (
        <Truck weight="duotone" className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{option.label}</span>
    </div>
  );

  const brandOptions = [
    { value: 'All', label: 'All Brands' },
    ...options.map(opt => ({ value: opt.brand, label: opt.brand }))
  ];

  const seriesOptions = [
    { value: 'All', label: 'All Series' },
    ...currentSeriesOptions.map(s => ({ value: s, label: s }))
  ];

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex-1 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Truck weight="duotone" className="w-3.5 h-3.5" />
            Vehicle Brand
          </label>
          <Select 
            value={brandOptions.find(o => o.value === selectedBrand) || brandOptions[0]}
            onChange={(selected) => handleBrandChange({ target: { value: selected.value } })}
            options={brandOptions}
            formatOptionLabel={formatBrandOption}
            styles={selectStyles}
            isSearchable={false}
            classNamePrefix="react-select"
          />
        </div>

        <div className="flex-1 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <CarProfile weight="duotone" className="w-3.5 h-3.5" />
            Vehicle Series
          </label>
          <Select 
            value={seriesOptions.find(o => o.value === selectedSeries) || seriesOptions[0]}
            onChange={(selected) => handleSeriesChange({ target: { value: selected.value } })}
            options={seriesOptions}
            styles={selectStyles}
            isSearchable={false}
            classNamePrefix="react-select"
          />
        </div>
      </div>
    </div>
  );
}
