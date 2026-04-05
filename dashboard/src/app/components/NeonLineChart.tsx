import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

interface NeonLineChartProps {
  data: number[];
  color: string;
  height?: number;
  maxVal?: number;
  fillOpacity?: number;
}

export function NeonLineChart({
  data,
  color,
  height = 70,
  maxVal = 100,
  fillOpacity = 0.15,
}: NeonLineChartProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={`glow-${color.replace("#", "")}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <YAxis domain={[0, maxVal]} hide />
        <Area
          type="monotoneX"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
          filter={`url(#glow-${color.replace("#", "")})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
