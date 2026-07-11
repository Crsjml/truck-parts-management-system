import React, { useState, useEffect } from 'react';
import { fetchVehicleOptions } from '../authStore';
import { Truck, CarProfile } from '@phosphor-icons/react';
import Select, { components } from 'react-select';

const CustomOption = (props) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {props.data.icon && <props.data.icon weight="duotone" className="w-4 h-4 text-muted-foreground" />}
        <span>{props.data.label}</span>
      </div>
    </components.Option>
  );
};

const CustomSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        {props.data.icon && <props.data.icon weight="duotone" className="w-4 h-4 text-brandBlue-400" />}
        <span>{props.data.label}</span>
      </div>
    </components.SingleValue>
  );
};

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
      backgroundColor: 'transparent',
      borderColor: state.isFocused ? '#ef4444' : 'transparent',
      boxShadow: 'none',
      borderRadius: '0.75rem',
      minHeight: '2.5rem',
      cursor: 'pointer',
      '&:hover': {
        borderColor: '#334155'
      }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#ef4444' : state.isFocused ? '#1e293b' : 'transparent',
      color: state.isSelected ? 'white' : '#f8fafc',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '0.5rem 1rem',
      '&:active': {
        backgroundColor: '#b91c1c'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: '#f8fafc',
      fontSize: '0.875rem',
      fontWeight: '600'
    }),
    input: (base) => ({
      ...base,
      color: '#f8fafc'
    }),
    placeholder: (base) => ({
      ...base,
      color: '#64748b',
      fontSize: '0.875rem'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#64748b',
      padding: '4px 8px',
      '&:hover': { color: '#f8fafc' }
    })
  };

  const brandOptions = [
    { value: 'All', label: 'All Brands', icon: CarProfile },
    ...[...new Set(options.map(o => o.brand))].sort().map(b => ({ value: b, label: b, icon: Truck }))
  ];

  const seriesOptions = [
    { value: 'All', label: 'All Series' },
    ...currentSeriesOptions.map(s => ({ value: s, label: s }))
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 sm:w-48 space-y-1">
        <label className="flex items-center gap-1.5 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
          <Truck weight="duotone" className="w-3.5 h-3.5" />
          Vehicle Brand
        </label>
        <Select 
          value={brandOptions.find(o => o.value === selectedBrand) || brandOptions[0]}
          onChange={(selected) => handleBrandChange({ target: { value: selected.value } })}
          options={brandOptions}
          components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
          styles={selectStyles}
          isSearchable={false}
          classNamePrefix="react-select"
          menuPortalTarget={document.body}
          menuPosition="fixed"
        />
      </div>

      <div className="flex-1 sm:w-48 space-y-1">
        <label className="flex items-center gap-1.5 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
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
          menuPortalTarget={document.body}
          menuPosition="fixed"
        />
      </div>
    </div>
  );
}
