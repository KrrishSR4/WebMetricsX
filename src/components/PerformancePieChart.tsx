import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Timer } from 'lucide-react';

interface PerformancePieChartProps {
  data: {
    dns: number | null;
    connect: number | null;
    ttfb: number | null;
    download: number | null;
  } | null;
  tlsHandshake?: number | null;
}

const COLORS = {
  dns: 'hsl(var(--chart-1))',
  tcp: 'hsl(var(--chart-2))',
  tls: 'hsl(var(--chart-3))',
  ttfb: 'hsl(var(--chart-4))',
  download: 'hsl(var(--chart-5))',
};

export function PerformancePieChart({ data, tlsHandshake }: PerformancePieChartProps) {
  if (!data) {
    return (
      <Card className="chart-animate">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-chart-1" />
            <CardTitle className="text-base font-medium">Timing Distribution</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">No timing data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'DNS Lookup', value: data.dns || 0, color: COLORS.dns },
    { name: 'TCP Connect', value: data.connect || 0, color: COLORS.tcp },
    { name: 'TLS Handshake', value: tlsHandshake || 0, color: COLORS.tls },
    { name: 'TTFB', value: data.ttfb || 0, color: COLORS.ttfb },
    { name: 'Download', value: data.download || 0, color: COLORS.download },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.value}ms ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {chartData.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">
            {item.name}: {item.value}ms
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="chart-animate">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-chart-1" />
            <CardTitle className="text-base font-medium">Timing Distribution</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">Total: {total}ms</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {renderLegend()}
      </CardContent>
    </Card>
  );
}
