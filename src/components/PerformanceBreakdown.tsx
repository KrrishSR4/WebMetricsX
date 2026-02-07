import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Timer } from 'lucide-react';

interface PerformanceBreakdownProps {
  data: {
    dns: number | null;
    connect: number | null;
    ttfb: number | null;
    download: number | null;
  } | null;
}

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)'];

export function PerformanceBreakdown({ data }: PerformanceBreakdownProps) {
  if (!data) {
    return (
      <Card className="chart-animate">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-chart-4" />
            <CardTitle className="text-base font-medium">Performance Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'DNS', value: data.dns ?? 0, label: 'DNS Lookup' },
    { name: 'Connect', value: data.connect ?? 0, label: 'TCP Connect' },
    { name: 'TTFB', value: data.ttfb ?? 0, label: 'Time to First Byte' },
    { name: 'Download', value: data.download ?? 0, label: 'Content Download' },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="chart-animate">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-chart-4" />
            <CardTitle className="text-base font-medium">Performance Breakdown</CardTitle>
          </div>
          <span className="text-sm font-medium">{total}ms total</span>
        </div>
      </CardHeader>
      <CardContent>
        <div id="performance-breakdown-chart" className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}ms`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => [`${value}ms`, props.payload.label]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-medium">{item.value}ms</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
