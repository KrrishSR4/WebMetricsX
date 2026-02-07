import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

interface PieChartCardProps {
  data: {
    dns: number | null;
    connect: number | null;
    ttfb: number | null;
    download: number | null;
  } | null;
}

const COLORS = {
  dns: '#3b82f6',   // blue
  connect: '#22c55e', // green
  ttfb: '#fb923c',   // orange
  download: '#a855f7' // purple
};

export function PieChartCard({ data }: PieChartCardProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance Breakdown</CardTitle>
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'DNS', value: data.dns || 0, color: COLORS.dns },
    { name: 'Connect', value: data.connect || 0, color: COLORS.connect },
    { name: 'TTFB', value: data.ttfb || 0, color: COLORS.ttfb },
    { name: 'Download', value: data.download || 0, color: COLORS.download }
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance Breakdown</CardTitle>
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No performance breakdown data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value}ms ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance Distribution</CardTitle>
        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div id="pie-chart" className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-xs">
                    {value}: {entry.payload.value}ms
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="font-medium">Total Time</div>
            <div className="text-lg font-bold text-chart-1">{total}ms</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="font-medium">Slowest Phase</div>
            <div className="text-lg font-bold text-chart-2">
              {chartData.reduce((max, item) => item.value > max.value ? item : max).name}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
