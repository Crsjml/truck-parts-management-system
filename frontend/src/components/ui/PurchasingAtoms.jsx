import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CaretRight, X, Funnel, ArrowsDownUp, Star, MagnifyingGlass } from '@phosphor-icons/react';

// ─── Custom Styles for React-Select Glassmorphism ─────────────────────────────
export const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--color-secondary)',
    borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-border)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-accent)' : 'none',
    '&:hover': {
      borderColor: 'var(--color-accent)'
    },
    color: 'var(--color-foreground)',
    borderRadius: '0.5rem',
    minHeight: '38px',
    padding: '0 4px',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#0f172a', // Tailwind slate-900 for dark mode dropdown menu
    border: '1px solid #1e293b',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    zIndex: 9999
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? 'var(--color-accent)' 
      : state.isFocused 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'transparent',
    color: state.isSelected ? '#fff' : '#e2e8f0', // slate-200 text
    '&:active': {
      backgroundColor: 'var(--color-accent)'
    },
    padding: '8px 12px'
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--color-foreground)'
  }),
  input: (base) => ({
    ...base,
    color: 'var(--color-foreground)'
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--color-muted-foreground)'
  }),
  menuPortal: base => ({ ...base, zIndex: 9999 })
};

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const map = {
    'Draft':          'bg-secondary text-muted-foreground border-border',
    'RFQ Sent':       'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'Confirmed':      'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Received':       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Cancelled':      'bg-red-500/15 text-red-400 border-red-500/30',
    'Waiting Bills':  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Bills Received': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 text-11px font-bold rounded-full border ${map[status] || map['Draft']}`}>
      {status}
    </span>
  );
};

export const StatChip = ({ label, count, icon: Icon, color, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
      active ? `${color} shadow-sm` : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
    }`}
  >
    {Icon && <Icon weight="duotone" className="w-3.5 h-3.5" />}
    {label}
    <span className={`px-1.5 py-0.5 rounded text-2xs font-black ${active ? 'bg-black/20' : 'bg-background'}`}>
      {count}
    </span>
  </button>
);

export const PipelineChevron = ({ currentStatus }) => {
  const stages = ['Draft', 'RFQ Sent', 'Confirmed', 'Received'];
  let idx = stages.indexOf(currentStatus);
  if (idx === -1) idx = 0;
  if (currentStatus === 'Cancelled')
    return <div className="flex border border-red-500/50 rounded-lg overflow-hidden bg-red-950/20 text-red-400 font-bold px-4 py-1.5 text-xs">CANCELLED</div>;
  return (
    <div className="flex bg-secondary/50 rounded-lg border border-border overflow-hidden text-2xs font-bold uppercase tracking-wider">
      {stages.map((s, i) => (
        <div key={s} className={`flex items-center px-3 py-2 relative transition-colors ${i === idx ? 'bg-accent text-white' : i < idx ? 'text-foreground' : 'text-muted-foreground'}`}>
          {s}
          {i !== stages.length - 1 && <CaretRight weight="bold" className={`absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-3 h-3 ${i === idx ? 'text-accent' : 'text-border'}`} />}
        </div>
      ))}
    </div>
  );
};

// ─── Drag & Drop Image Uploader ─────────────────────────────────────────────
export const DragDropImageUploader = ({ image, onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave' || e.type === 'drop') setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onImageUpload(reader.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-muted-foreground">Product Image</label>
      <div 
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
          isDragging ? 'border-accent bg-accent/10' : 'border-border bg-secondary hover:bg-secondary/80'
        }`}
      >
        <input type="file" accept="image/*" onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
        
        {image ? (
          <div className="relative w-full h-32 flex items-center justify-center">
            <img src={image} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
              <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-md">Change Image</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center mb-3 border border-border shadow-sm">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">Click or Drag & Drop</p>
            <p className="text-2xs text-muted-foreground mt-1 uppercase tracking-wider">SVG, PNG, JPG or GIF</p>
          </div>
        )}
      </div>
      {image && (
        <button onClick={() => onImageUpload('')} className="text-xs text-red-400 hover:text-red-300 self-start font-semibold">
          Remove Image
        </button>
      )}
    </div>
  );
};

// ─── Control Panel (Search + Filters + GroupBy + Favorites) ──────────────────
export const ControlPanel = ({ search, onSearch, filters, activeFilters, onFilter, groupByOptions, activeGroup, onGroupBy, favoritesCount, onFavoritesFilter, showFavoritesOnly }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const filterRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false);
      if (groupRef.current && !groupRef.current.contains(e.target)) setShowGroup(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent transition-colors"
        />
        {search && (
          <button onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setShowFilters(v => !v); setShowGroup(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeFilters.length > 0 ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
          >
            <Funnel weight={activeFilters.length > 0 ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
            Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
          {showFilters && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-xl shadow-2xl p-2 min-w-[200px] animate-fadeIn">
              {filters.map(f => (
                <label key={f.value} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer text-sm text-foreground transition-colors focus-within:ring-2 focus-within:ring-accent">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes(f.value)}
                    onChange={() => onFilter(f.value)}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  {f.label}
                </label>
              ))}
              {activeFilters.length > 0 && (
                <button onClick={() => activeFilters.forEach(f => onFilter(f))} className="w-full mt-1 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-lg text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Group By */}
      {groupByOptions.length > 0 && (
        <div className="relative" ref={groupRef}>
          <button
            onClick={() => { setShowGroup(v => !v); setShowFilters(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeGroup ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
          >
            <ArrowsDownUp weight="regular" className="w-3.5 h-3.5" />
            {activeGroup ? `By: ${activeGroup}` : 'Group By'}
          </button>
          {showGroup && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-xl shadow-2xl p-2 min-w-[160px] animate-fadeIn">
              {activeGroup && (
                <button onClick={() => { onGroupBy(null); setShowGroup(false); }} className="w-full px-3 py-2 rounded-lg hover:bg-secondary text-left text-xs text-accent font-semibold mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Clear grouping
                </button>
              )}
              {groupByOptions.map(g => (
                <button key={g} onClick={() => { onGroupBy(g); setShowGroup(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeGroup === g ? 'text-accent font-bold bg-accent/10' : 'text-foreground hover:bg-secondary'}`}>
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites */}
      <button
        onClick={onFavoritesFilter}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${showFavoritesOnly ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
      >
        <Star weight={showFavoritesOnly ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
        Favorites {favoritesCount > 0 && `(${favoritesCount})`}
      </button>
    </div>
  );
};

// ─── Grouped DataTable ────────────────────────────────────────────────────────
export const GroupedTable = ({ columns, rows, groupBy, onRowClick, favKey, favorites, onToggleFav }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [rows, sortCol, sortDir]);

  const grouped = useMemo(() => {
    if (!groupBy) return { '': sorted };
    return sorted.reduce((acc, row) => {
      const key = row[groupBy] || 'Unknown';
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [sorted, groupBy]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div className="glass-panel border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-secondary/80 text-muted-foreground">
              <th className="py-2.5 px-3 w-8"></th>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider ${col.align === 'right' ? 'text-right' : ''} ${col.sortable !== false ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                >
                  <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {sortCol === col.key && <span className="text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {Object.entries(grouped).map(([group, groupRows]) => (
              <React.Fragment key={group}>
                {groupBy && group && (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-2 px-4 bg-secondary/40 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                      {group} <span className="text-accent ml-1">({groupRows.length})</span>
                    </td>
                  </tr>
                )}
                {groupRows.map((row) => (
                  <tr
                    key={row.id || row.id}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-secondary/50 transition-colors group ${onRowClick ? 'cursor-pointer focus-within:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent' : ''}`}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    <td className="py-3 px-3">
                      <button
                        onClick={e => { e.stopPropagation(); onToggleFav(row.id || row.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full p-1"
                      >
                        <Star weight={favorites.includes(row.id || row.id) ? 'fill' : 'regular'} className={`w-4 h-4 ${favorites.includes(row.id || row.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`} />
                      </button>
                    </td>
                    {columns.map(col => (
                      <td key={col.key} className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''}`}>
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
