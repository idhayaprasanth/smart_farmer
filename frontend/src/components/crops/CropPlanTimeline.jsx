import { CalendarClock, Lightbulb, Shovel, Sprout } from "lucide-react";
import GlassCard from "../common/GlassCard";

export default function CropPlanTimeline({ plan, cropName = "", className = "" }) {
  const noPlan = !plan || plan?.message;
  const status = typeof plan?.status === "string" ? plan.status.toLowerCase() : "";

  if (noPlan) {
    return (
      <GlassCard className={`p-4 md:p-5 ${className}`}>
        <h3 className="font-display text-lg">Active Crop Plan</h3>
        <p className="mt-2 text-sm text-slate-300">
          {plan?.message || "No crop plan found for this field yet. Add a crop to generate a plan."}
        </p>
      </GlassCard>
    );
  }

  const planData = plan?.plan || {};
  const growthTimeline = Array.isArray(planData?.growth_timeline) ? planData.growth_timeline : [];

  return (
    <GlassCard className={`p-4 md:p-5 neon-border-blue ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg md:text-xl">Active Crop Plan Timeline</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-neon-blue/30 bg-neon-blue/10 px-2 py-1 text-xs text-neon-blue">
            {cropName || "Current Crop"}
          </span>
          {status ? (
            <span className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1 text-xs text-neon-green">
              {status}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-neon-blue">
            <Shovel className="h-3.5 w-3.5" />
            Soil Preparation
          </p>
          <p className="text-sm text-slate-200">{planData.soil_preparation || "N/A"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-neon-green">
            <Sprout className="h-3.5 w-3.5" />
            Planting Phase
          </p>
          <p className="text-sm text-slate-200">{planData.planting_phase || "N/A"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:col-span-2 xl:col-span-1">
          <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-neon-purple">
            <CalendarClock className="h-3.5 w-3.5" />
            Expected Harvest
          </p>
          <p className="text-sm text-slate-200">{planData.expected_harvest || "N/A"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="mb-3 text-xs uppercase tracking-wide text-neon-blue">Growth Timeline</p>
        {growthTimeline.length === 0 ? (
          <p className="text-sm text-slate-300">No growth timeline generated.</p>
        ) : (
          <div className="relative ml-1 border-l border-neon-blue/30 pl-6">
            {growthTimeline.map((step, index) => (
              <div key={`${step.phase || "phase"}-${index}`} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-neon-blue shadow-neonBlue" />
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="font-display text-base text-slate-100">{step.phase || `Phase ${index + 1}`}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {step.days_range || "Timeline not available"}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">{step.key_actions || "No actions provided."}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-neon-green">
          <Lightbulb className="h-3.5 w-3.5" />
          Pro Tips
        </p>
        <p className="text-sm text-slate-200">{planData.pro_tips || "N/A"}</p>
      </div>
    </GlassCard>
  );
}
