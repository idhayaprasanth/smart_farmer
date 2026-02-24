import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

const initialState = {
  field_name: "",
  location: "",
  soil_type: ""
};

export default function CreateFieldModal({ open, onClose, onCreate, creating }) {
  const [form, setForm] = useState(initialState);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    await onCreate({
      ...form,
      soil_type: form.soil_type || "unknown"
    });
    setForm(initialState);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass-card neon-border-blue w-full max-w-lg p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl">Create New Field</h3>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-300">Field Name</span>
            <input
              required
              value={form.field_name}
              onChange={(e) => setForm((prev) => ({ ...prev, field_name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none transition focus:border-neon-blue"
              placeholder="North Block A"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-300">Location</span>
            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none transition focus:border-neon-blue"
              placeholder="West Farm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-300">Soil Type</span>
            <input
              value={form.soil_type}
              onChange={(e) => setForm((prev) => ({ ...prev, soil_type: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none transition focus:border-neon-blue"
              placeholder="red soil"
            />
          </label>

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl bg-neon-blue px-4 py-2 text-sm font-semibold text-night-950 transition hover:shadow-neonBlue disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Field"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
