'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function ResponseTimeChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">No data available for this period.</p>
      </div>
    );
  }

  // Format data for Recharts (parse dates, etc)
  const chartData = data.map(item => ({
    time: new Date(item.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    responseTime: item.responseTime || 0,
    success: item.success,
  })).reverse(); // Reverse to chronological

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="colorRt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="time" 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false}
          axisLine={false}
          minTickGap={30}
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}ms`}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
          itemStyle={{ color: '#2563eb' }}
          formatter={(value: any) => [`${value} ms`, 'Response Time']}
        />
        <Area 
          type="monotone" 
          dataKey="responseTime" 
          stroke="#3b82f6" 
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRt)"
          activeDot={{ r: 4, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
