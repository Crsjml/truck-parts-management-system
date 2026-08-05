import React from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { PAYMENT_METHODS, PAYMENT_LABELS, PAYMENT_COLORS, getRankDeltaBadge } from '../../utils/salesAnalytics';

const CHART_TOOLTIP_STYLE = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '12px' };
const CHART_ITEM_STYLE = { color: 'hsl(var(--popover-foreground))' };
const CHART_AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const CHART_CURSOR_FILL = 'hsl(var(--chart-cursor))';
const CHART_SERIES = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-danger))'
];
const RANK_COLORS = {
  neutral: 'hsl(var(--chart-6))',
  new: 'hsl(var(--chart-3))',
  up: 'hsl(var(--chart-2))',
  down: 'hsl(var(--chart-danger))'
};
const STATUS_CHART_COLORS = {
  Completed: 'hsl(var(--chart-2))',
  'Ready for Pickup': 'hsl(var(--chart-1))',
  Cancelled: 'hsl(var(--chart-danger))',
  'Order Placed': 'hsl(var(--chart-4))',
  COMPLETED: 'hsl(var(--chart-2))',
  READY_FOR_PICKUP: 'hsl(var(--chart-1))',
  CANCELLED: 'hsl(var(--chart-danger))',
  ORDER_PLACED: 'hsl(var(--chart-4))'
};



export function MoverTick({ x, y, payload, movers }) {
  const name = payload?.value || '';
  const item = movers?.find(m => m.name === name);

  let badgeText = '—';
  let badgeStyle = 'text-muted-foreground bg-secondary border-border';

  if (item) {
    const badge = getRankDeltaBadge(item.rankDelta);
    badgeText = badge.text;
    badgeStyle = badge.style;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x="-220" y="-12" width="210" height="24">
        <div className="flex items-center justify-between w-full h-full pr-2 gap-2">
          <span className="text-xs text-muted-foreground truncate flex-1 text-right" title={name}>
            {name}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border min-w-[36px] text-center shrink-0 ${badgeStyle}`}>
            {badgeText}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

export default function ChartRenderer({ type, data, formatCurrency, extraProps }) {
  if (type === 'trend') {
    return (
      <>
        <table className="sr-only">
          <caption>Revenue Trend Data</caption>
          <thead>
            <tr>
              <th>Period</th>
              <th>Current Period Revenue</th>
              <th>Prior Period Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                <td>{formatCurrency(row.revenue || 0)}</td>
                <td>{formatCurrency(row.prior || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
            <Tooltip 
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              formatter={(value) => [formatCurrency(value), undefined]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="plainline" />
            <Line dataKey="revenue" name="Current Period" type="monotone" stroke="hsl(var(--chart-positive))" strokeWidth={2} dot={data.length === 1} activeDot={{ r: 6, strokeWidth: 0 }} />
            <Line dataKey="prior" name="Prior Period" type="monotone" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={data.length === 1} activeDot={{ r: 6, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (type === 'movers') {
    return (
      <>
        <table className="sr-only">
          <caption>Top Movers Data</caption>
          <thead>
            <tr>
              <th>Part Name</th>
              <th>Volume</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.quantity} units</td>
                <td>{formatCurrency(row.payload?.revenue || row.revenue || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 60, left: 40, bottom: 20 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<MoverTick movers={data} />} width={220} />
            <Tooltip 
              cursor={{ fill: CHART_CURSOR_FILL }}
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              formatter={(value, name, item) => [`${value} units (${formatCurrency(item?.payload?.revenue || 0)})`, 'Volume']}
            />
            <Bar 
              dataKey="quantity" 
              radius={[0, 6, 6, 0]} 
              barSize={40} 
              label={{ position: 'right', fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 'bold' }}
              onClick={(data) => {
                const { onMoverClick } = extraProps || {};
                if (onMoverClick && data && data.name) onMoverClick(data.name);
              }}
              cursor="pointer"
            >
              {data.map((entry, index) => {
                let fill = RANK_COLORS.neutral;
                if (entry.rankDelta === null) fill = RANK_COLORS.new;
                else if (entry.rankDelta > 0) fill = RANK_COLORS.up;
                else if (entry.rankDelta < 0) fill = RANK_COLORS.down;
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (type === 'treemap' || type === 'donut') {
    const { onDrill } = extraProps || {};
    return (
      <>
        <table className="sr-only">
          <caption>Category Revenue Allocation Data</caption>
          <thead>
            <tr>
              <th>Category</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{formatCurrency ? formatCurrency(row.revenue || 0) : row.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={4}
              stroke="none"
              onClick={(entry) => {
                 if (entry.hasChildren && onDrill) onDrill(entry.name);
              }}
            >
              {data.map((entry, index) => {
                const fill = entry.name === 'Uncategorized' ? 'hsl(var(--chart-6))' : CHART_SERIES[index % CHART_SERIES.length];
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={fill} 
                    style={{ cursor: entry.hasChildren ? 'pointer' : 'default', transition: 'opacity 0.2s', outline: 'none' }}
                    onMouseEnter={(e) => { e.target.style.opacity = 0.8; }}
                    onMouseLeave={(e) => { e.target.style.opacity = 1; }}
                  />
                );
              })}
            </Pie>
            <Tooltip 
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              formatter={(val) => [formatCurrency ? formatCurrency(val) : `₱${val.toLocaleString()}`, 'Revenue']}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (type === 'payments') {
    return (
      <>
        <table className="sr-only">
          <caption>Payment Method Mix Data</caption>
          <thead>
            <tr>
              <th>Period</th>
              {PAYMENT_METHODS.map(m => <th key={m}>{PAYMENT_LABELS[m] || m}</th>)}
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                {PAYMENT_METHODS.map(m => <td key={m}>{formatCurrency(row[m] || 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
            <Tooltip 
              cursor={{ fill: CHART_CURSOR_FILL }}
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
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
      </>
    );
  }

  if (type === 'peak') {
    return (
      <>
        <table className="sr-only">
          <caption>Peak Sales Data</caption>
          <thead>
            <tr>
              <th>Period</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                <td>{formatCurrency(row.revenue || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
            <Tooltip 
              cursor={{ fill: CHART_CURSOR_FILL }}
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              formatter={(value) => [formatCurrency(value), undefined]}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {
                data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isPeak ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'} />
                ))
              }
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (type === 'status') {
    return (
      <>
        <table className="sr-only">
          <caption>Order Status Data</caption>
          <thead>
            <tr>
              <th>Status</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={4}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_CHART_COLORS[entry.name] || 'hsl(var(--chart-6))'} 
                  style={{ outline: 'none' }}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              formatter={(val) => [val, 'Orders']}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </>
    );
  }

  return null;
}
