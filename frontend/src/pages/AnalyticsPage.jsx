import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ErrorState, LoadingState } from "../components/common/LoadingState";
import PageWrapper from "../components/common/PageWrapper";
import { aiApi, cropApi, fieldApi, sensorApi } from "../services/api";
import { formatDate } from "../utils/format";

function moistureChartData(history = []) {
  return history.slice(-60).map((item) => {
    const d = new Date(item.timestamp);
    return {
      label: Number.isNaN(d.getTime()) ? "--" : d.toLocaleTimeString(),
      moisture: Number(item.moisture || 0)
    };
  });
}

function waterUsageData(history = []) {
  const dayMap = {};
  for (let i = 1; i < history.length; i += 1) {
    const prev = Number(history[i - 1]?.moisture || 0);
    const curr = Number(history[i]?.moisture || 0);
    const ts = history[i]?.timestamp ? new Date(history[i].timestamp) : null;
    const key = ts && !Number.isNaN(ts.getTime()) ? ts.toISOString().slice(5, 10) : "N/A";
    const gain = curr - prev;
    if (!dayMap[key]) dayMap[key] = 0;
    if (gain > 0) dayMap[key] += gain;
  }

  return Object.entries(dayMap)
    .map(([date, usage]) => ({ date, usage: Number(usage.toFixed(2)) }))
    .slice(-10);
}

export default function AnalyticsPage() {
  const [activeField, setActiveField] = useState("");
  const [sensorHistory, setSensorHistory] = useState([]);
  const [cropHistory, setCropHistory] = useState([]);
  const [fieldHealth, setFieldHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    try {
      const active = await fieldApi.getActiveField();
      const fieldId = active?.active_field || "";
      setActiveField(fieldId);

      if (!fieldId) {
        setSensorHistory([]);
        setCropHistory([]);
        setFieldHealth(null);
        return;
      }

      const [history, crops, health] = await Promise.all([
        sensorApi.getSensorHistory(fieldId).catch(() => []),
        cropApi.getCropHistory(fieldId).catch(() => []),
        aiApi.getFieldHealth(fieldId).catch(() => null)
      ]);

      setSensorHistory(Array.isArray(history) ? history : []);
      setCropHistory(Array.isArray(crops) ? crops : []);
      setFieldHealth(health);
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const moistureData = useMemo(() => moistureChartData(sensorHistory), [sensorHistory]);
  const usageData = useMemo(() => waterUsageData(sensorHistory), [sensorHistory]);
  const score =
    typeof fieldHealth?.soil_health_score === "number" ? fieldHealth.soil_health_score : 72;

  return (
    <PageWrapper
      title="Field Analytics"
      subtitle="Trend intelligence for moisture behavior, water usage, and soil performance"
      action={
        <button
          type="button"
          onClick={loadAnalytics}
          className="rounded-xl bg-neon-blue px-3 py-2 text-sm font-semibold text-night-950 transition hover:shadow-neonBlue"
        >
          Refresh Analytics
        </button>
      }
    >
      {loading ? <LoadingState label="Loading analytics..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Field</p>
              <p className="mt-2 font-display text-2xl text-neon-blue">{activeField || "None"}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Sensor Entries</p>
              <p className="mt-2 font-display text-2xl text-neon-green">{sensorHistory.length}</p>
            </div>
            <div className="glass-card neon-border-green p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Soil Health Score</p>
              <p className="mt-2 font-display text-2xl text-neon-green">{score.toFixed(1)} / 100</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="glass-card p-4">
              <h3 className="mb-3 font-display text-lg">Moisture Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={moistureData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(6,15,31,0.92)",
                        border: "1px solid rgba(34,255,136,0.35)",
                        borderRadius: "12px"
                      }}
                    />
                    <defs>
                      <linearGradient id="moistureArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22ff88" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#22ff88" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="moisture"
                      stroke="#22ff88"
                      strokeWidth={2}
                      fill="url(#moistureArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-4">
              <h3 className="mb-3 font-display text-lg">Water Usage Visualization</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(6,15,31,0.92)",
                        border: "1px solid rgba(51,187,255,0.35)",
                        borderRadius: "12px"
                      }}
                    />
                    <Bar dataKey="usage" fill="#33bbff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="mb-3 font-display text-lg">Crop History Timeline</h3>
            <div className="max-h-72 space-y-2 overflow-auto pr-1 scroll-thin">
              {cropHistory.length === 0 ? (
                <p className="text-sm text-slate-300">No crop timeline available.</p>
              ) : (
                cropHistory
                  .slice()
                  .reverse()
                  .map((crop) => (
                    <div key={crop.crop_id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                      <p className="font-display text-base text-slate-100">{crop.crop_name}</p>
                      <p className="text-slate-300">Seed Date: {crop.seed_date}</p>
                      <p className="text-slate-300">Created: {formatDate(crop.created_at)}</p>
                      <span className="mt-2 inline-flex rounded-lg bg-neon-blue/20 px-2 py-1 text-xs text-neon-blue">
                        {crop.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="glass-card p-4 text-sm text-slate-200">
            <h3 className="mb-2 font-display text-lg">AI Soil Health Insights</h3>
            <p>
              {fieldHealth?.recommendations ||
                "Future-ready placeholder: AI soil health insights will appear here as field logs grow over time."}
            </p>
          </div>
        </div>
      ) : null}
    </PageWrapper>
  );
}
