import { useRef, useState, useCallback, useEffect } from "react";
import Vapi from "@vapi-ai/web";

export type VapiPhase = "idle" | "connecting" | "listening" | "speaking" | "ended";

export interface VapiTranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseVapiCallOptions {
  publicKey: string;
  onTranscriptUpdate?: (messages: VapiTranscriptMessage[]) => void;
  onPhaseChange?: (phase: VapiPhase) => void;
  onError?: (error: string) => void;
  onCallEnd?: (messages: VapiTranscriptMessage[]) => void;
}

export function useVapiCall({
  publicKey,
  onTranscriptUpdate,
  onPhaseChange,
  onError,
  onCallEnd,
}: UseVapiCallOptions) {
  const vapiRef = useRef<Vapi | null>(null);
  const messagesRef = useRef<VapiTranscriptMessage[]>([]);
  const [phase, setPhase] = useState<VapiPhase>("idle");
  const [messages, setMessages] = useState<VapiTranscriptMessage[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const callbacksRef = useRef({ onTranscriptUpdate, onPhaseChange, onError, onCallEnd });

  useEffect(() => {
    callbacksRef.current = { onTranscriptUpdate, onPhaseChange, onError, onCallEnd };
  }, [onTranscriptUpdate, onPhaseChange, onError, onCallEnd]);

  const updatePhase = useCallback((newPhase: VapiPhase) => {
    setPhase(newPhase);
    callbacksRef.current.onPhaseChange?.(newPhase);
  }, []);

  const addMessage = useCallback((msg: VapiTranscriptMessage) => {
    messagesRef.current = [...messagesRef.current, msg];
    setMessages([...messagesRef.current]);
    callbacksRef.current.onTranscriptUpdate?.([...messagesRef.current]);
  }, []);

  const initVapi = useCallback(() => {
    if (vapiRef.current) return vapiRef.current;
    if (!publicKey) return null;
    const vapi = new Vapi(publicKey);

    vapi.on("call-start", () => {
      updatePhase("listening");
    });

    vapi.on("call-end", () => {
      updatePhase("ended");
      callbacksRef.current.onCallEnd?.([...messagesRef.current]);
    });

    vapi.on("speech-start", () => {
      updatePhase("speaking");
    });

    vapi.on("speech-end", () => {
      updatePhase("listening");
    });

    vapi.on("volume-level", (level: number) => {
      setVolumeLevel(level);
    });

    vapi.on("message", (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        if (message.role === "user" || message.role === "assistant") {
          addMessage({ role: message.role, content: message.transcript });
        }
      } else if (message.type === "conversation-update" && Array.isArray(message.conversation)) {
        const newMsgs: VapiTranscriptMessage[] = message.conversation
          .filter((m: any) => m.role === "user" || m.role === "assistant")
          .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content || "" }));
        messagesRef.current = newMsgs;
        setMessages([...newMsgs]);
        callbacksRef.current.onTranscriptUpdate?.([...newMsgs]);
      }
    });

    vapi.on("error", (error: any) => {
      console.error("Vapi error:", error);
      const msg = typeof error === "string" ? error : error?.message || "Voice call error";
      callbacksRef.current.onError?.(msg);
    });

    vapiRef.current = vapi;
    return vapi;
  }, [publicKey, updatePhase, addMessage]);

  const startCall = useCallback(
    async (config: { systemPrompt: string; firstMessage: string; voiceGender: "male" | "female"; lang?: string; extraKeywords?: string[] }) => {
      const vapi = initVapi();
      if (!vapi) {
        callbacksRef.current.onError?.("Vapi public key is not configured");
        return;
      }
      messagesRef.current = [];
      setMessages([]);
      updatePhase("connecting");

      try {
        await vapi.start({
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: config.lang || "en-IN",
            smartFormat: true,
            keywords: (() => {
              const raw = [
                "Priya:3", "Abhay:3",
                "rice:2", "roti:2", "chapati:2", "dal:2", "idli:2", "dosa:2", "sambar:2", "paratha:2", "paneer:2", "biryani:2", "curd:2", "khichdi:2", "poha:2", "upma:2",
                "sugar:2", "glucose:2", "diabetes:2", "hypertension:2", "pressure:2",
                "metformin:3", "amlodipine:3", "aspirin:3", "paracetamol:2", "insulin:2", "atorvastatin:2", "losartan:2", "telmisartan:2", "glimepiride:2",
                "medication:2", "medicine:2", "tablet:2", "prescribed:2",
                "breakfast:2", "lunch:2", "dinner:2", "snack:2",
                ...(config.extraKeywords || []).map(k => {
                  const word = k.replace(/[^a-zA-Z]/g, "");
                  return word ? `${word}:3` : "";
                }),
              ];
              return raw.filter(k => /^[a-zA-Z]+(?::[0-9]+)?$/.test(k));
            })(),
          },
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.7,
            maxTokens: 300,
            messages: [{ role: "system", content: config.systemPrompt }],
          },
          voice: {
            provider: "11labs",
            voiceId: config.voiceGender === "female"
              ? "EXAVITQu4vr4xnSDxMaL"   // Bella — warm, natural female
              : "ErXwobaYiN019PkySvjV",   // Antoni — calm, clear male
            stability: 0.6,
            similarityBoost: 0.8,
            speed: 1.0,
          },
          firstMessage: config.firstMessage,
          silenceTimeoutSeconds: 30,
          maxDurationSeconds: 600,
          backgroundDenoisingEnabled: true,
          modelOutputInMessagesEnabled: true,
          responseDelaySeconds: 0.4,
          hipaaEnabled: false,
          name: config.voiceGender === "female" ? "Dr. Priya" : "Dr. Abhay",
        } as any);
      } catch (err) {
        console.error("Vapi start error:", err);
        updatePhase("idle");
        callbacksRef.current.onError?.(err instanceof Error ? err.message : "Failed to start voice call");
      }
    },
    [initVapi, updatePhase]
  );

  const stopCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    vapiRef.current?.setMuted(muted);
  }, []);

  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, []);

  return { phase, messages, volumeLevel, startCall, stopCall, setMuted };
}
