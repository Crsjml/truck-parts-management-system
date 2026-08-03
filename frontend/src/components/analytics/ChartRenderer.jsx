import React from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Treemap, Cell } from 'recharts';
import { PAYMENT_METHODS, PAYMENT_LABELS, PAYMENT_COLORS, getRankDeltaBadge } from '../../utils/salesAnalytics';

function TreemapCell({ x, y, width, height, name, revenue, value, hasChildren, maxRev, onDrill, formatCurrency }) {
  if (!width || !height || width < 5 || height < 5) return null;

  const rev = revenue ?? value ?? 0;
  const ratio = maxRev > 0 ? Math.min(1, Math.max(0, rev / maxRev)) : 0.5;
  const fill = `hsl(217, 85%, ${Math.round(18 + ratio * 30)}%)`;

  const handleClick = () => {
    if (hasChildren && onDrill) {
      onDrill(name);
    }
  };

  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        width={width}
        height={height}
        fill={fill}
        stroke="#0f172a"
        strokeWidth={2}
        rx={6}
        ry={6}
        className={hasChildren ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        onClick={handleClick}
      />
      {width > 40 && height > 28 && (
        <foreignObject x={4} y={4} width={width - 8} height={height - 8} style={{ pointerEvents: 'none' }}>
          <div className="w-full h-full flex flex-col justify-between p-1 text-white overflow-hidden">
            <span className="text-xs font-semibold leading-tight truncate" title={name}>
              {name}
            </span>
            <span className="text-[11px] font-bold text-blue-200">
              {formatCurrency ? formatCurrency(rev) : `₱${rev.toLocaleString()}`}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export function MoverTick({ x, y, payload, movers }) {
  const name = payload?.value || '';
  const item = movers?.find(m => m.name === name);

  let badgeText = '—';
  let badgeStyle = 'text-muted-foreground bg-slate-800/80 border-slate-700/50';

  if (item) {
    const badge = getRankDeltaBadge(item.rankDelta);
    badgeText = badge.text;
    badgeStyle = badge.style;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x="-215" y="-18" width="210" height="36">
        <div className="flex items-center justify-end gap-1.5 w-full h-full pr-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeStyle}`}>
            {badgeText}
          </span>
          <span className="text-[11px] text-foreground font-medium truncate text-right max-w-[140px]" title={name}>
            {name}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

export default function ChartRenderer({ type, data, formatCurrency, extraProps }) {
  if (type === 'trend') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
          <Tooltip 
            cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value) => [formatCurrency(value), undefined]}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line dataKey="revenue" name="Current Period" type="monotone" stroke="#059669" strokeWidth={2} dot={data.length === 1} activeDot={{ r: 6, strokeWidth: 0 }} />
          <Line dataKey="prior" name="Prior Period" type="monotone" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={data.length === 1} activeDot={{ r: 6, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'movers') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 60, left: 40, bottom: 20 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<MoverTick movers={data} />} width={220} />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value, name, item) => [`${value} units (${formatCurrency(item?.payload?.revenue || 0)})`, 'Volume']}
          />
          <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={40} label={{ position: 'right', fill: '#f8fafc', fontSize: 14, fontWeight: 'bold' }} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'treemap') {
    const { maxCatRevenue, onDrill } = extraProps || {};
    return (
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="revenue"
          aspectRatio={4 / 3}
          stroke="#0f172a"
          content={
            <TreemapCell
              maxRev={maxCatRevenue}
              onDrill={onDrill}
              formatCurrency={formatCurrency}
            />
          }
        >
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(val) => [formatCurrency(val), 'Revenue']}
          />
        </Treemap>
      </ResponsiveContainer>
    );
  }

  if (type === 'payments') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value) => [formatCurrency(value), undefined]}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {PAYMENT_METHODS.map((method) => (
            <Bar 
              key={method} 
              dataKey={method} 
              name={PAYMENT_LABELS[method]} 
              fill={PAYMENT_COLORS[method]} 
              stackId="a" 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'peak') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
          <Tooltip 
            cursor={{ fill: '#1e293b' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value) => [formatCurrency(value), undefined]}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {
              data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isPeak ? '#059669' : '#3b82f6'} />
              ))
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
