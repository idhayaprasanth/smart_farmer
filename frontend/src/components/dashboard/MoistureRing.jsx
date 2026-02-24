import { motion } from "framer-motion";
import { clamp } from "../../utils/format";

export default function MoistureRing({ value = 0 }) {
  const normalized = clamp(Number(value) || 0, 0, 100);
  const radius = 66;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="rgba(255,255,255,0.12)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          stroke="url(#moistureGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <defs>
          <linearGradient id="moistureGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#33bbff" />
            <stop offset="100%" stopColor="#22ff88" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl font-semibold text-white">{normalized}%</p>
        <p className="text-xs uppercase tracking-widest text-slate-300">Moisture</p>
      </div>
    </div>
  );
}
