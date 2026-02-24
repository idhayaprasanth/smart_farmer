import GlassCard from "../common/GlassCard";

export default function AISummaryCard({ plan, className = "" }) {
  const noPlan = !plan || plan?.message;

  if (noPlan) {
    return (
      <GlassCard className={`p-4 md:p-5 ${className}`}>
        <h3 className="font-display text-lg">AI Summary</h3>
        <p className="mt-2 text-sm text-slate-300">
          No AI plan available yet. Add a crop for the active field to generate insights.
        </p>
      </GlassCard>
    );
  }

  const planData = plan?.plan || {};

  return (
    <GlassCard className={`p-4 md:p-5 neon-border-blue ${className}`}>
      <h3 className="font-display text-lg">AI Summary</h3>
      <div className="mt-3 grid gap-3 text-sm text-slate-200 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Soil Preparation</p>
          <p>{planData.soil_preparation || "N/A"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Planting Phase</p>
          <p>{planData.planting_phase || "N/A"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Expected Harvest</p>
          <p>{planData.expected_harvest || "N/A"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pro Tips</p>
          <p>{planData.pro_tips || "N/A"}</p>
        </div>
      </div>
    </GlassCard>
  );
}
