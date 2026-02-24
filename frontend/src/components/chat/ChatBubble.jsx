import { Bot, User2 } from "lucide-react";

export default function ChatBubble({ role, content, confidence, loading }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[70%] ${
          isUser
            ? "bg-neon-blue/20 text-white neon-border-blue"
            : "border border-white/10 bg-white/10 text-slate-100"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-300">
          {isUser ? <User2 className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-neon-green" />}
          <span>{isUser ? "You" : "AI Assistant"}</span>
        </div>

        {loading ? (
          <div className="flex gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-neon-blue [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-neon-blue [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-neon-blue" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{content}</p>
        )}

        {!isUser && confidence && !loading ? (
          <span className="mt-3 inline-flex rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1 text-xs font-medium text-neon-green">
            Confidence: {confidence}
          </span>
        ) : null}
      </div>
    </div>
  );
}
