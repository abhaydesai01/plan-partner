import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, getStoredToken, api } from "@/lib/api";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { Phone, PhoneOff, Mic, MicOff, Stethoscope, Loader2, CheckCircle, Activity, Globe } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const PERSONAS: Record<string, { name: string; title: string; voiceGender: "male" | "female" }> = {
  dr_priya: {
    name: "Dr. Priya",
    title: "Your Health Companion",
    voiceGender: "female",
  },
  dr_abhay: {
    name: "Dr. Abhay",
    title: "Your Health Companion",
    voiceGender: "male",
  },
};

const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "mr-IN", label: "Marathi" },
  { code: "bn-IN", label: "Bengali" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "pa-IN", label: "Punjabi" },
] as const;

function getPersonaForGender(gender?: string): string {
  if (!gender) return "dr_priya";
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return "dr_priya";
  if (g === "female" || g === "f") return "dr_abhay";
  return "dr_priya";
}

const PatientAIDoctor = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [consultationActive, setConsultationActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ logged: any[] } | null>(null);
  const [lang, setLang] = useState("en-IN");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consultationActiveRef = useRef(false);

  const patientGender = (session?.patient as any)?.gender;
  const personaKey = getPersonaForGender(patientGender);
  const persona = PERSONAS[personaKey];

  const voiceOutput = useVoiceOutput({ voiceGender: persona.voiceGender, lang });

  const sendToAIRef = useRef<(allMessages: Msg[]) => Promise<void>>();

  const voiceInput = useVoiceInput({
    lang,
    onFinalTranscript: (text) => {
      if (text.trim() && consultationActiveRef.current) {
        const userMsg: Msg = { role: "user", content: text };
        setMessages((prev) => {
          const updated = [...prev, userMsg];
          sendToAIRef.current?.(updated);
          return updated;
        });
      }
    },
  });

  const beginListening = useCallback(() => {
    if (!voiceInput.supported || !consultationActiveRef.current) return;
    setPhase("listening");
    // Small delay to let Chrome's audio system settle after TTS
    setTimeout(() => {
      if (consultationActiveRef.current) {
        voiceInput.startListening();
      }
    }, 400);
  }, [voiceInput]);

  const sendToAI = useCallback(async (allMessages: Msg[]) => {
    setPhase("processing");
    setIsLoading(true);
    let assistantText = "";
    try {
      const token = getStoredToken();
      const resp = await fetch(`${API_BASE}/chat/voice-doctor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMessages, persona: personaKey, lang }),
      });
      if (!resp.ok || !resp.body) throw new Error("AI error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              const text = assistantText;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
                }
                return [...prev, { role: "assistant", content: text }];
              });
            }
          } catch { /* skip */ }
        }
      }

      if (assistantText.trim()) {
        setPhase("speaking");
        voiceOutput.speak(assistantText.trim());
      } else {
        // Empty response - go back to listening
        beginListening();
      }
    } catch {
      toast({ title: "Connection issue", description: "Tap mic to continue speaking", variant: "destructive" });
      // Stay in consultation - don't break the session
      beginListening();
    }
    setIsLoading(false);
  }, [personaKey, lang, toast, voiceOutput, beginListening]);

  useEffect(() => {
    sendToAIRef.current = sendToAI;
  }, [sendToAI]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When TTS finishes speaking, transition to listening with a delay
  useEffect(() => {
    if (phase === "speaking" && !voiceOutput.isSpeaking && !isLoading && consultationActive) {
      beginListening();
    }
  }, [voiceOutput.isSpeaking, phase, isLoading, consultationActive, beginListening]);

  const startConsultation = () => {
    setStartTime(Date.now());
    setMessages([]);
    setSaveResult(null);
    setConsultationActive(true);
    consultationActiveRef.current = true;
    setPhase("processing");
    const greeting: Msg = { role: "user", content: "Hello doctor, I'm here for my daily check-in." };
    setMessages([greeting]);
    sendToAI([greeting]);
  };

  const endConsultation = async () => {
    voiceInput.stopListening();
    voiceOutput.stop();
    setConsultationActive(false);
    consultationActiveRef.current = false;
    setPhase("idle");
    setSaving(true);
    try {
      const durationSec = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      const result = await api.post("me/voice-conversation/save", {
        messages,
        persona: personaKey,
        duration_seconds: durationSec,
        lang,
      }) as { logged: any[]; extracted_actions: any[] };
      setSaveResult({ logged: result.logged || [] });
      // Invalidate dashboard queries so logged data shows immediately
      queryClient.invalidateQueries({ queryKey: ["me", "vitals"] });
      queryClient.invalidateQueries({ queryKey: ["me", "food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["me", "rewards"] });
      queryClient.invalidateQueries({ queryKey: ["me", "gamification"] });
      queryClient.invalidateQueries({ queryKey: ["me", "quick-log", "last"] });
      queryClient.invalidateQueries({ queryKey: ["me", "overview"] });
      toast({
        title: "Consultation saved",
        description: result.logged?.length > 0
          ? `${result.logged.length} health item${result.logged.length > 1 ? "s" : ""} auto-logged`
          : "Transcript saved to your records",
      });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleMic = () => {
    if (voiceInput.isListening) {
      voiceInput.stopListening();
      // Stay in consultation, just pause listening
      setPhase("processing");
    } else {
      voiceOutput.stop();
      setPhase("listening");
      voiceInput.startListening();
    }
  };

  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label || "English";
  const showControls = consultationActive && !saving;
  const showInitial = !consultationActive && messages.length === 0 && !saveResult && !saving;

  return (
    <div className="flex flex-col h-full max-h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white voice-header py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
            <Stethoscope className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold leading-tight truncate">{persona.name}</h1>
            <p className="text-[11px] sm:text-xs text-white/70">{persona.title}</p>
          </div>
          {consultationActive && (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${
                phase === "listening" ? "bg-emerald-300 animate-pulse"
                : phase === "speaking" ? "bg-yellow-300 animate-pulse"
                : "bg-white/60 animate-pulse"
              }`} />
              <span className="text-[11px] sm:text-xs font-medium text-white/90">
                {phase === "listening" ? "Listening" : phase === "speaking" ? "Speaking" : "Thinking"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 pwa-scroll">
        <div className="max-w-2xl mx-auto space-y-3">
          {showInitial && (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-5 sm:space-y-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/20">
                  <Stethoscope className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center">
                  <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </div>
              </div>
              <div className="text-center space-y-1.5 px-4">
                <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground">{persona.name}</h2>
                <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">Daily Health Check-in</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                  {persona.name} will ask about your vitals, meals, medications &amp; well-being.
                  Everything is auto-logged to your records.
                </p>
              </div>

              {/* Language picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/5 text-sm text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {langLabel}
                </button>
                {showLangPicker && (
                  <>
                    <button type="button" className="fixed inset-0 z-10" onClick={() => setShowLangPicker(false)} aria-label="Close" />
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-xl shadow-lg p-1.5 w-[180px] z-20 max-h-[200px] overflow-y-auto">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors touch-manipulation ${
                            lang === l.code
                              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={startConsultation}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-base shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all touch-manipulation"
              >
                <Phone className="w-5 h-5" />
                Start Consultation
              </button>
              {!voiceInput.supported && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg">
                  Voice input is not supported in your browser. Use Chrome or Edge.
                </p>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-1.5 sm:gap-2`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <Stethoscope className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white rounded-br-md shadow-sm"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-teal-500/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-teal-500/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {voiceInput.isListening && voiceInput.interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-teal-500/15 text-teal-700 dark:text-teal-300 rounded-br-md italic border border-teal-500/20">
                {voiceInput.interimTranscript}...
              </div>
            </div>
          )}

          {/* Save result */}
          {saveResult && (
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="font-semibold text-teal-700 dark:text-teal-300">Consultation Complete</span>
              </div>
              {saveResult.logged.length > 0 ? (
                <div className="space-y-1.5 pl-10">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Auto-logged</p>
                  {saveResult.logged.map((item, i) => (
                    <div key={i} className="text-sm text-foreground flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                      {item.type === "blood_pressure" && `BP: ${item.value}`}
                      {item.type === "blood_sugar" && `Blood Sugar: ${item.value}`}
                      {item.type === "food" && `Meal: ${item.meal_type}${item.notes ? ` - ${item.notes}` : ""}`}
                      {item.type === "medication" && `Medication: ${item.medication_name || "taken"}`}
                      {item.type === "symptom" && `Symptom: ${item.description}`}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pl-10">Conversation saved. No specific health data to log this time.</p>
              )}
              <button
                type="button"
                onClick={() => { setPhase("idle"); setMessages([]); setSaveResult(null); }}
                className="ml-10 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Start a new consultation
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom controls - ALWAYS visible during active consultation */}
      {showControls && (
        <div className="flex-shrink-0 border-t border-teal-500/10 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm voice-controls py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={toggleMic}
              disabled={isLoading || voiceOutput.isSpeaking}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all touch-manipulation ${
                voiceInput.isListening
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30 scale-110 ring-4 ring-teal-500/20"
                  : "bg-muted text-muted-foreground hover:bg-teal-500/10 hover:text-teal-600 shadow-md"
              } disabled:opacity-40 disabled:shadow-none`}
              aria-label={voiceInput.isListening ? "Stop" : "Speak"}
            >
              {voiceInput.isListening ? <MicOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Mic className="w-6 h-6 sm:w-7 sm:h-7" />}
            </button>
            <button
              type="button"
              onClick={endConsultation}
              disabled={messages.length < 2}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all touch-manipulation shadow-md hover:shadow-lg disabled:opacity-40 disabled:shadow-none"
              aria-label="End consultation"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 sm:mt-2.5 px-4">
            {voiceInput.isListening
              ? <span className="text-teal-600 dark:text-teal-400 font-medium">Listening... Speak now ({langLabel})</span>
              : voiceOutput.isSpeaking
              ? <span className="text-emerald-600 dark:text-emerald-400">{persona.name} is speaking...</span>
              : isLoading
              ? "Thinking..."
              : "Tap mic to speak"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientAIDoctor;
