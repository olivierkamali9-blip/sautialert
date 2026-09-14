"use client";

import { useState, useRef, useEffect } from "react";
import { VoiceAgentClient, AgentStatus } from "@/lib/voiceAgent";

const LANGUES = [
  { code: "francais", label: "Français" },
  { code: "swahili", label: "Kiswahili" },
  { code: "lingala", label: "Lingala" },
];

export default function VoiceOrb() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [langue, setLangue] = useState("francais");
  const [liveText, setLiveText] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const clientRef = useRef<VoiceAgentClient | null>(null);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const handleStart = async () => {
    setErrorMsg(null);
    setReference(null);
    const client = new VoiceAgentClient({
      onStatusChange: setStatus,
      onUserTranscript: (text) => setLiveText(text),
      onAgentTranscript: (text) => setLiveText(text),
      onTicketCreated: (ref) => setReference(ref),
      onError: (msg) => setErrorMsg(msg),
    });
    clientRef.current = client;
    await client.connect();
  };

  const handleStop = () => {
    clientRef.current?.disconnect();
    setStatus("idle");
    setLiveText("");
  };

  const isActive = status !== "idle" && status !== "error" && status !== "ended";

  const hintText = () => {
    switch (status) {
      case "connecting":
        return "Connexion en cours…";
      case "listening":
        return "Je vous écoute…";
      case "speaking":
        return "L'agent répond…";
      case "processing":
        return "Enregistrement en cours…";
      case "error":
        return "Une erreur est survenue";
      case "ended":
        return "Conversation terminée";
      default:
        return "Appuyez pour parler";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-center flex flex-col items-center">
      <div className="font-serif text-[15px] font-medium tracking-wide text-sage mb-16">
        Sauti<span className="text-brick">Alert</span>
      </div>

      {!isActive && (
        <div className="flex gap-2 justify-center mb-10">
          {LANGUES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLangue(l.code)}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                langue === l.code
                  ? "bg-deep text-cream border-deep"
                  : "border-deep/15 text-deep"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      <h1 className="font-serif text-3xl leading-snug text-deep mb-4 tracking-tight">
        {isActive ? hintText() : <>Nous vous écoutons.<br />Parlez librement.</>}
      </h1>

      {!isActive && (
        <p className="text-[15px] leading-relaxed text-[#565650] max-w-xs mb-14">
          Appuyez sur le micro et décrivez votre situation. Vous pouvez rester anonyme si vous le souhaitez.
        </p>
      )}

      {liveText && isActive && (
        <p className="text-sm text-[#565650] max-w-xs mb-10 min-h-[40px] italic">
          « {liveText} »
        </p>
      )}

      <div className="relative w-[180px] h-[180px] mb-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-deep/15" />
        <div className="absolute -inset-[18px] rounded-full border border-deep/8" />
        <button
          onClick={isActive ? handleStop : handleStart}
          className={`w-[116px] h-[116px] rounded-full bg-deep flex items-center justify-center shadow-[0_8px_30px_rgba(15,46,43,0.25)] transition-transform hover:scale-105 ${
            status === "listening" ? "animate-pulse" : ""
          }`}
          aria-label={isActive ? "Terminer la conversation" : "Commencer à parler"}
        >
          {isActive ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="#F7F4EE" />
            </svg>
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z"
                stroke="#F7F4EE"
                strokeWidth="1.5"
              />
              <path
                d="M19 11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11"
                stroke="#F7F4EE"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M12 18V21" stroke="#F7F4EE" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {!isActive && <div className="text-[13px] text-sage tracking-wide mb-16">{hintText()}</div>}

      {reference && (
        <div className="mb-8 px-5 py-4 rounded-lg bg-deep/5 border border-deep/10 text-sm text-deep">
          Signalement enregistré — référence <strong>{reference}</strong>
        </div>
      )}

      {errorMsg && (
        <div className="mb-8 px-5 py-4 rounded-lg bg-brick/10 border border-brick/20 text-sm text-brick">
          {errorMsg}
        </div>
      )}

      <div className="text-[12.5px] text-[#8a8a82] leading-relaxed border-t border-deep/10 pt-6 w-full">
        <strong className="text-ink font-medium">Confidentiel et sécurisé.</strong>
        <br />
        Ce signalement est traité par l'équipe Suivi &amp; Redevabilité.
      </div>
    </div>
  );
}
