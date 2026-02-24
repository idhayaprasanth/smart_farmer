import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-300">
      <Loader2 className="h-5 w-5 animate-spin text-neon-blue" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}
