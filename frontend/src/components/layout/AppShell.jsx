import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen px-2 py-3 md:px-3 md:py-4">
      <div className="mx-auto flex w-full items-start gap-3 md:gap-4">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div className="w-full flex-1">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-xl border border-white/10 bg-white/10 p-2"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="font-display text-sm tracking-widest text-neon-blue">SMART IRRIGATION</p>
          </div>

          {open ? (
            <div className="mb-4 md:hidden">
              <Sidebar />
            </div>
          ) : null}

          <main className="glass-card min-h-[calc(100vh-2rem)] border-white/10 p-4 md:p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
