import React, { useState, useEffect } from 'react';
import { fetchVehicleOptions } from '../authStore';

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

  const currentSeriesOptions = options.find(o => o.brand === selectedBrand)?.series || [];

  if (loading) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Vehicle Filter:</span>
      </div>
      
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <select 
            value={selectedBrand}
            onChange={handleBrandChange}
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
          >
            <option value="All">All Brands</option>
            {options.map(opt => (
              <option key={opt.brand} value={opt.brand}>{opt.brand}</option>
            ))}
          </select>
        </div>

        <div>
          <select 
            value={selectedSeries}
            onChange={handleSeriesChange}
            disabled={selectedBrand === 'All'}
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="All">All Series</option>
            {currentSeriesOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
