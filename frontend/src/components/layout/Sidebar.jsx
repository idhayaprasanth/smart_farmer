import { motion } from "framer-motion";
import {
  Bot,
  ChartNoAxesCombined,
  Droplets,
  Home,
  Leaf,
  LogOut,
  Sprout
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/fields", label: "Fields", icon: Sprout },
  { to: "/crops", label: "Crops", icon: Leaf },
  { to: "/chat", label: "AI Chat", icon: Bot },
  { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined }
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="glass-card neon-border-blue w-full p-4 md:sticky md:top-3 md:w-72">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-neon-green/20 p-2 text-neon-green shadow-neonGreen">
          <Droplets className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-sm tracking-widest text-slate-400">SMART AI</p>
          <h2 className="font-display text-xl">Irrigation Grid</h2>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                    isActive
                      ? "bg-neon-blue/20 text-white neon-border-blue"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
