import { motion } from "framer-motion";
import GlassCard from "../common/GlassCard";

export default function MotorIndicator({ status = "OFF" }) {
  const isOn = String(status).toUpperCase() === "ON";

  return (
    <GlassCard
      className={`p-4 ${isOn ? "neon-border-green" : "border border-red-500/40 bg-red-900/10 shadow-neonRed"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Motor Status</h3>
        <motion.span
          animate={{ opacity: [1, 0.45, 1], scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className={`inline-flex h-3 w-3 rounded-full ${
            isOn ? "bg-neon-green shadow-neonGreen" : "bg-neon-red shadow-neonRed"
          }`}
        />
      </div>

      <p
        className={`mt-4 text-3xl font-display ${
          isOn ? "text-neon-green animate-pulseGlow" : "text-neon-red"
        }`}
      >
        {isOn ? "ON" : "OFF"}
      </p>
    </GlassCard>
  );
}
