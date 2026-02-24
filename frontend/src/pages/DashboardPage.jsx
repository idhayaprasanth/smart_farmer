import { Cloud, Thermometer } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { LoadingState, ErrorState } from "../components/common/LoadingState";
import PageWrapper from "../components/common/PageWrapper";
import CropPlanTimeline from "../components/crops/CropPlanTimeline";
import MoistureRing from "../components/dashboard/MoistureRing";
import MotorIndicator from "../components/dashboard/MotorIndicator";
import SensorHistoryChart from "../components/dashboard/SensorHistoryChart";
import usePolling from "../hooks/usePolling";
import { cropApi, dashboardApi, fieldApi, sensorApi } from "../services/api";

function StatCard({ icon: Icon, title, value, unit, accent = "blue" }) {
  const accentClass =
    accent === "green" ? "text-neon-green border-neon-green/30" : "text-neon-blue border-neon-blue/30";

  return (
    <div className="glass-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
        <span className={`rounded-lg border p-1.5 ${accentClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span>{title}</span>
      </div>
      <p className="font-display text-2xl">
        {value}
        {unit ? <span className="ml-1 text-base text-slate-300">{unit}</span> : null}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [plan, setPlan] = useState(null);
  const [sensorSourceField, setSensorSourceField] = useState("");
  const [liveSensorFallback, setLiveSensorFallback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    setLiveSensorFallback(null);

    try {
      const dashboardData = await dashboardApi.getDashboard();
      setDashboard(dashboardData);

      const fieldId = dashboardData?.active_field;
      if (!fieldId) {
        setSensorHistory([]);
        setSensorSourceField("");
        setPlan(null);
        return;
      }

      const planPromise = cropApi.getPlan(fieldId).catch(() => ({ message: "No plan found" }));
      let historyData = await sensorApi.getSensorHistory(fieldId).catch(() => []);
      let resolvedSensorSourceField = fieldId;
      let resolvedLiveSensor =
        dashboardData?.live_sensor ||
        (Array.isArray(historyData) && historyData.length > 0 ? historyData[historyData.length - 1] : null);

      const noActiveSensorData =
        !resolvedLiveSensor || !Array.isArray(historyData) || historyData.length === 0;

      if (noActiveSensorData) {
        const fields = await fieldApi.getFields().catch(() => []);
        const fieldRows = Array.isArray(fields) ? fields : [];

        const historyByField = await Promise.all(
          fieldRows.map(async (field) => {
            const id = field?.field_id;
            if (!id) return { id: "", history: [], latest: null };

            const history = await sensorApi.getSensorHistory(id).catch(() => []);
            const normalized = Array.isArray(history) ? history : [];
            const latest = normalized.length > 0 ? normalized[normalized.length - 1] : null;
            return { id, history: normalized, latest };
          })
        );

        const fallback = historyByField
          .filter((row) => row.latest)
          .sort((a, b) => {
            const aTime = new Date(a.latest?.timestamp || 0).getTime();
            const bTime = new Date(b.latest?.timestamp || 0).getTime();
            return bTime - aTime;
          })[0];

        if (fallback) {
          resolvedSensorSourceField = fallback.id;
          historyData = fallback.history;
          resolvedLiveSensor = fallback.latest;
          setLiveSensorFallback(fallback.latest);
        }
      }

      setSensorSourceField(resolvedSensorSourceField);
      setSensorHistory(Array.isArray(historyData) ? historyData : []);
      const planData = await planPromise;
      setPlan(planData);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(() => loadDashboard(true), 5000, true);

  const liveSensor = liveSensorFallback || dashboard?.live_sensor || {};
  const liveCrop = dashboard?.live_crop || null;
  const moisture = Number(liveSensor?.moisture || 0);
  const temperature = Number(liveSensor?.temperature || 0);
  const humidity = Number(liveSensor?.humidity || 0);

  const motorStatus = useMemo(() => {
    if (!dashboard?.active_field) return "OFF";
    if (Number.isFinite(moisture) && moisture < 40) return "ON";
    return "OFF";
  }, [dashboard?.active_field, moisture]);

  return (
    <PageWrapper
      title="Mission Dashboard"
      subtitle="Real-time field telemetry, AI monitoring, and motor control status"
      action={
        <button
          type="button"
          onClick={() => loadDashboard(false)}
          className="rounded-xl bg-neon-blue px-3 py-2 text-sm font-semibold text-night-950 transition hover:shadow-neonBlue"
        >
          Refresh
        </button>
      }
    >
      {loading ? <LoadingState label="Syncing live dashboard..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card p-4">
              <MoistureRing value={moisture} />
            </div>
            <StatCard icon={Thermometer} title="Temperature" value={temperature.toFixed(1)} unit="C" />
            <StatCard icon={Cloud} title="Humidity" value={humidity.toFixed(1)} unit="%" accent="green" />
            <MotorIndicator status={motorStatus} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <SensorHistoryChart history={sensorHistory} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-card p-4">
              <h3 className="font-display text-lg">Active Field</h3>
              <p className="mt-2 text-2xl font-display text-neon-green">
                {dashboard?.active_field || "No active field"}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Sensor source: {sensorSourceField || dashboard?.active_field || "N/A"}
              </p>
            </div>

            <div className="glass-card p-4">
              <h3 className="font-display text-lg">Active Crop</h3>
              {liveCrop ? (
                <div className="mt-3 space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="text-slate-400">Crop:</span> {liveCrop.crop_name}
                  </p>
                  <p>
                    <span className="text-slate-400">Seed Date:</span> {liveCrop.seed_date}
                  </p>
                  <p>
                    <span className="text-slate-400">Soil:</span> {liveCrop.soil_type}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-300">No active crop detected.</p>
              )}
            </div>
          </div>

          <CropPlanTimeline plan={plan} cropName={liveCrop?.crop_name} className="w-full" />
        </div>
      ) : null}
    </PageWrapper>
  );
}
