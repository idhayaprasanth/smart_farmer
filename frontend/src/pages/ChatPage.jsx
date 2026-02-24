import { motion } from "framer-motion";
import { Languages, SendHorizonal, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ChatBubble from "../components/chat/ChatBubble";
import PageWrapper from "../components/common/PageWrapper";
import { aiApi } from "../services/api";

const initialMessage = {
  role: "assistant",
  content:
    "Ask me about irrigation, fertilizer strategy, plant disease handling, or next crop planning.",
  confidence: "high"
};

const languageOptions = [
  { label: "English", code: "en-IN" },
  { label: "Tamil", code: "ta-IN" },
  { label: "Hindi", code: "hi-IN" }
];

function VoiceModeOrb({ active }) {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <motion.div
        animate={
          active
            ? { scale: [1, 1.3, 1], opacity: [0.35, 0.8, 0.35] }
            : { scale: 1, opacity: 0.25 }
        }
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-12 w-12 rounded-full bg-neon-blue/30 blur-sm"
      />
      <motion.div
        animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue/70 to-neon-green/70"
      >
        <div className="flex items-end gap-[2px]">
          {[0, 1, 2].map((bar) => (
            <motion.span
              key={bar}
              animate={
                active
                  ? { height: ["6px", "12px", "7px", "11px", "6px"] }
                  : { height: "5px" }
              }
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: bar * 0.12
              }}
              className="w-[3px] rounded-full bg-white"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([initialMessage]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responseLanguage, setResponseLanguage] = useState("English");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const endRef = useRef(null);

  const selectedLanguage =
    languageOptions.find((lang) => lang.label === responseLanguage) || languageOptions[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isSpeaking]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  function stopSpeech() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function speakText(text) {
    if (!voiceEnabled || !text || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.code;
    const voice = voices.find((item) =>
      item.lang.toLowerCase().startsWith(selectedLanguage.code.split("-")[0].toLowerCase())
    );
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");

    const languageInstruction =
      responseLanguage === "English" ? "" : `\n\nRespond strictly in ${responseLanguage}.`;

    try {
      const response = await aiApi.chat(`${trimmed}${languageInstruction}`);
      const assistantMessage = {
        role: "assistant",
        content: response?.answer || "No answer received.",
        confidence: response?.confidence || "medium"
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speakText(assistantMessage.content);
    } catch (err) {
      setError(err.message || "Failed to get AI response");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I am currently unable to process your request. Please retry.",
          confidence: "low"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageWrapper
      title="AI Agronomy Chat"
      subtitle="Conversational assistant with language control and voice response mode"
    >
      <div className="glass-card flex h-[76vh] flex-col p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-neon-blue" />
            <select
              value={responseLanguage}
              onChange={(e) => {
                setResponseLanguage(e.target.value);
                stopSpeech();
              }}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-neon-blue"
            >
              {languageOptions.map((lang) => (
                <option key={lang.label} value={lang.label}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <VoiceModeOrb active={isSpeaking} />
            <button
              type="button"
              onClick={() => {
                if (voiceEnabled) {
                  stopSpeech();
                }
                setVoiceEnabled((prev) => !prev);
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition ${
                voiceEnabled
                  ? "border-neon-green/40 bg-neon-green/10 text-neon-green hover:shadow-neonGreen"
                  : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {voiceEnabled ? "Voice On" : "Voice Off"}
            </button>
          </div>
        </div>

        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}`}
              role={message.role === "assistant" ? "assistant" : "user"}
              content={message.content}
              confidence={message.confidence}
            />
          ))}

          {loading ? <ChatBubble role="assistant" loading /> : null}
          <div ref={endRef} />
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}

        <form onSubmit={sendMessage} className="mt-4 flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask AI in ${responseLanguage}...`}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-neon-blue"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:shadow-neonBlue disabled:opacity-60"
          >
            <SendHorizonal className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </PageWrapper>
  );
}
