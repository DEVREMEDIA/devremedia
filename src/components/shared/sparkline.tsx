'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

type Props = { data: number[]; color?: string };

export function Sparkline({ data, color = 'currentColor' }: Props) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer>
        <LineChart data={series}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
