import { motion } from "framer-motion";
import { Droplets, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  function enterApp(e) {
    e.preventDefault();
    navigate("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-neon-blue/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-neon-green/15 blur-3xl" />
      </div>

      <motion.form
        onSubmit={enterApp}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card neon-border-blue relative w-full max-w-md space-y-6 p-7"
      >
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neon-green/20 text-neon-green shadow-neonGreen">
            <Droplets className="h-6 w-6" />
          </div>
          <p className="font-display text-sm tracking-[0.25em] text-neon-blue">FUTURE FARM OPS</p>
          <h1 className="font-display text-3xl leading-tight">Smart AI Irrigation</h1>
        </div>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-widest text-slate-300">Operator Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 outline-none transition focus:border-neon-blue"
          />
        </label>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon-green px-4 py-2.5 font-semibold text-night-950 transition hover:shadow-neonGreen"
        >
          <Sparkles className="h-4 w-4" />
          Enter Command Center
        </button>
      </motion.form>
    </div>
  );
}
