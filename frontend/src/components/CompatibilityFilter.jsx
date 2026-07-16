import React, { useState, useEffect } from 'react';
import { fetchVehicleOptions } from '../authStore';
import { Truck, CarProfile } from '@phosphor-icons/react';
import Select, { components } from 'react-select';

const CustomOption = (props) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {props.data.icon && <props.data.icon weight="duotone" className="w-4 h-4 opacity-70 text-muted-foreground" />}
        <span>{props.data.label}</span>
      </div>
    </components.Option>
  );
};

const CustomSingleValue = (props) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        {props.data.icon && <props.data.icon weight="duotone" className="w-4 h-4 text-accent" />}
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
    ? []
    : options.find(o => o.brand === selectedBrand)?.series || [];

  if (loading) {
    return (
      <div className="flex gap-2 animate-pulse">
        <div className="w-[140px] h-[46px] bg-border/50 rounded-2xl"></div>
        <div className="w-[140px] h-[46px] bg-border/50 rounded-2xl"></div>
      </div>
    );
  }

  // React-Select dark mode styles matching token system
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--accent) / 0.2)' : 'none',
      borderRadius: '1rem',
      minHeight: '46px',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      opacity: state.isDisabled ? 0.4 : 1,
      '&:hover': {
        borderColor: state.isDisabled ? 'hsl(var(--border))' : 'hsl(var(--border))'
      },
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      overflow: 'hidden',
      zIndex: 9999
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
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
      '&:active': {
        backgroundColor: 'hsl(var(--accent) / 0.2)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
      fontWeight: '600'
    }),
    input: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))'
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      padding: '4px 8px',
      '&:hover': { color: 'hsl(var(--foreground))' }
    })
  };

  const brandOptions = [
    { value: 'All', label: 'All Brands', icon: Truck },
    ...[...new Set(options.map(o => o.brand))].sort().map(b => ({ value: b, label: b, icon: Truck }))
  ];

  const seriesOptions = selectedBrand === 'All' 
    ? [{ value: 'All', label: 'Series...', icon: CarProfile }]
    : [
        { value: 'All', label: 'All Series', icon: CarProfile },
        ...currentSeriesOptions.map(s => ({ value: s, label: s, icon: CarProfile }))
      ];

  return (
    <div className="flex items-center gap-2">
      <div className="w-full sm:w-[250px]">
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

      <div className="w-full sm:w-[250px]">
        <Select 
          value={seriesOptions.find(o => o.value === selectedSeries) || seriesOptions[0]}
          onChange={(selected) => handleSeriesChange({ target: { value: selected.value } })}
          options={seriesOptions}
          styles={selectStyles}
          components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
          classNamePrefix="react-select"
          menuPortalTarget={document.body}
          menuPosition="fixed"
          isDisabled={selectedBrand === 'All'}
        />
      </div>
    </div>
  );
}
