import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import GlassCard from "../common/GlassCard";

function toChartData(history = []) {
  return history.slice(-40).map((item) => {
    const date = item?.timestamp ? new Date(item.timestamp) : null;
    return {
      label: date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString() : "--",
      moisture: Number(item?.moisture ?? 0),
      temperature: Number(item?.temperature ?? 0),
      humidity: Number(item?.humidity ?? 0)
    };
  });
}

export default function SensorHistoryChart({ history = [] }) {
  const chartData = toChartData(history);

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg">Sensor Trend</h3>
        <span className="text-xs text-slate-300">{chartData.length} points</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(6,15,31,0.92)",
                border: "1px solid rgba(51, 187, 255, 0.35)",
                borderRadius: "14px"
              }}
            />
            <Line
              type="monotone"
              dataKey="moisture"
              stroke="#22ff88"
              strokeWidth={2.5}
              dot={false}
              name="Moisture"
            />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#33bbff"
              strokeWidth={2}
              dot={false}
              name="Temperature"
            />
            <Line
              type="monotone"
              dataKey="humidity"
              stroke="#7c8cff"
              strokeWidth={2}
              dot={false}
              name="Humidity"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
