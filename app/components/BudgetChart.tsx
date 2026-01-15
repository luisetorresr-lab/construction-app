'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Project {
  name: string;
  budget: number;
  spent: number;
}

interface BudgetChartProps {
  projects: Project[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#18181b] border border-zinc-800 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium mb-2">{payload[0].payload.name}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function BudgetChart({ projects }: BudgetChartProps) {
  // Transform data for recharts
  const chartData = projects.map((project) => ({
    name: project.name,
    Budget: project.budget,
    Spent: project.spent,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis
          dataKey="name"
          tick={{ fill: '#a1a1aa' }}
          axisLine={{ stroke: '#3f3f46' }}
          tickLine={{ stroke: '#3f3f46' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fill: '#a1a1aa' }}
          axisLine={{ stroke: '#3f3f46' }}
          tickLine={{ stroke: '#3f3f46' }}
          tickFormatter={(value) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: '#a1a1aa' }}
          iconType="square"
        />
        <Bar
          dataKey="Budget"
          fill="#6366f1"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="Spent"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
