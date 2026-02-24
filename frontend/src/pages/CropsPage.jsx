import { Eye, Leaf, Sprout, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../components/common/LoadingState";
import PageWrapper from "../components/common/PageWrapper";
import CropPlanTimeline from "../components/crops/CropPlanTimeline";
import { cropApi, fieldApi } from "../services/api";
import { formatDate } from "../utils/format";

export default function CropsPage() {
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [activeCrop, setActiveCrop] = useState(null);
  const [history, setHistory] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    crop_name: "",
    seed_date: new Date().toISOString().slice(0, 10),
    soil_type: ""
  });

  async function loadCropData(fieldOverride = "") {
    setLoading(true);
    setError("");

    try {
      const [active, allFields] = await Promise.all([
        fieldApi.getActiveField(),
        fieldApi.getFields().catch(() => [])
      ]);
      const fieldId = active?.active_field || "";
      const normalizedFields = Array.isArray(allFields) ? allFields : [];

      setActiveField(fieldId);
      setFields(normalizedFields);

      const targetFieldId =
        fieldOverride || selectedField || fieldId || normalizedFields[0]?.field_id || "";
      setSelectedField(targetFieldId);

      if (!targetFieldId) {
        setActiveCrop(null);
        setHistory([]);
        setPlan(null);
        return;
      }

      const [liveCrop, cropHistory, fieldPlan] = await Promise.all([
        cropApi.getLiveCrop(targetFieldId).catch(() => ({})),
        cropApi.getCropHistory(targetFieldId).catch(() => []),
        cropApi.getPlan(targetFieldId).catch(() => ({ message: "No plan found" }))
      ]);

      const fieldData = normalizedFields.find((f) => f.field_id === targetFieldId);
      setActiveCrop(liveCrop?.message ? null : liveCrop);
      setHistory(Array.isArray(cropHistory) ? cropHistory : []);
      setPlan(fieldPlan);
      setForm((prev) => ({
        ...prev,
        soil_type: fieldData?.soil_type || prev.soil_type || "red soil"
      }));
    } catch (err) {
      setError(err.message || "Failed to load crop data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCropData();
  }, []);

  async function addCrop(e) {
    e.preventDefault();
    if (!selectedField) {
      setError("Select a field before adding crops.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await cropApi.createCrop({
        field_id: selectedField,
        crop_name: form.crop_name,
        seed_date: form.seed_date,
        soil_type: form.soil_type
      });
      setForm((prev) => ({ ...prev, crop_name: "" }));
      await loadCropData(selectedField);
    } catch (err) {
      setError(err.message || "Failed to add crop");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageWrapper
      title="Crop Management"
      subtitle="Add crops, review cleaner crop history, and open plan timeline only when needed"
    >
      {loading ? <LoadingState label="Loading crop data..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <div className="space-y-5">
          <div className="glass-card p-4">
            <h3 className="font-display text-lg">Add Crop</h3>
            <form onSubmit={addCrop} className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Field</span>
                <select
                  required
                  value={selectedField}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedField(value);
                    loadCropData(value);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-neon-green"
                >
                  <option value="">Select field</option>
                  {fields.map((field) => (
                    <option key={field.field_id} value={field.field_id}>
                      {field.field_name || field.field_id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Crop Name</span>
                <input
                  required
                  value={form.crop_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, crop_name: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-neon-green"
                  placeholder="Peanut"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Seed Date</span>
                <input
                  type="date"
                  required
                  value={form.seed_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, seed_date: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-neon-green"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Soil Type</span>
                <input
                  required
                  value={form.soil_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, soil_type: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-neon-green"
                  placeholder="red soil"
                />
              </label>

              <div className="md:col-span-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !selectedField}
                  className="inline-flex items-center gap-2 rounded-xl bg-neon-green px-4 py-2 text-sm font-semibold text-night-950 transition hover:shadow-neonGreen disabled:opacity-60"
                >
                  <Sprout className="h-4 w-4" />
                  {submitting ? "Adding..." : "Add Crop"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  disabled={!plan}
                  className="inline-flex items-center gap-2 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-4 py-2 text-sm font-semibold text-neon-blue transition hover:shadow-neonBlue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  View Crop Plan
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass-card p-4">
              <h3 className="font-display text-lg">Active Field</h3>
              <p className="mt-2 font-display text-2xl text-neon-blue">{activeField || "None"}</p>
              <p className="mt-2 text-sm text-slate-300">Selected field: {selectedField || "None"}</p>
            </div>
            <div className="glass-card p-4 lg:col-span-2">
              <h3 className="font-display text-lg">Active Crop</h3>
              {activeCrop ? (
                <div className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
                  <p>
                    <span className="text-slate-400">Crop Name:</span> {activeCrop.crop_name}
                  </p>
                  <p>
                    <span className="text-slate-400">Soil Type:</span> {activeCrop.soil_type}
                  </p>
                  <p>
                    <span className="text-slate-400">Seed Date:</span> {activeCrop.seed_date}
                  </p>
                  <p>
                    <span className="text-slate-400">Status:</span> {activeCrop.status}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-300">No active crop on selected field.</p>
              )}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="mb-3 font-display text-lg">Crop History</h3>
            <div className="max-h-[420px] space-y-3 overflow-auto pr-1 scroll-thin">
              {history.length === 0 ? (
                <p className="text-sm text-slate-300">No crop history available.</p>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((crop) => (
                    <div key={crop.crop_id} className="relative pl-6">
                      <span className="absolute left-0 top-5 h-2.5 w-2.5 rounded-full bg-neon-green shadow-neonGreen" />
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center">
                          <div>
                            <p className="mb-1 flex items-center gap-2 font-display text-base text-slate-100">
                              <Leaf className="h-4 w-4 text-neon-green" />
                              {crop.crop_name}
                            </p>
                            <p className="text-xs text-slate-400">Crop ID: {crop.crop_id}</p>
                          </div>
                          <p className="text-sm text-slate-200">
                            <span className="text-slate-400">Seed:</span> {crop.seed_date}
                          </p>
                          <p className="text-sm text-slate-200">
                            <span className="text-slate-400">Soil:</span> {crop.soil_type || "N/A"}
                          </p>
                          <div>
                            <span className="inline-flex rounded-lg bg-neon-blue/20 px-2 py-1 text-xs text-neon-blue">
                              {crop.status}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">Created: {formatDate(crop.created_at)}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showPlanModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
          <div className="w-full max-w-5xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="rounded-xl border border-white/15 bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CropPlanTimeline plan={plan} cropName={activeCrop?.crop_name} />
          </div>
        </div>
      ) : null}
    </PageWrapper>
  );
}
