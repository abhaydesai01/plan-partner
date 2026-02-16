import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useVapiCall, VapiTranscriptMessage } from "@/hooks/useVapiCall";
import {
  Phone, PhoneOff, Mic, MicOff, Stethoscope, CheckCircle, Activity, Globe, Loader2, AlertCircle,
} from "lucide-react";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "";

const PERSONAS: Record<string, { name: string; title: string; voiceGender: "male" | "female" }> = {
  dr_priya: { name: "Dr. Priya", title: "Your Health Companion", voiceGender: "female" },
  dr_abhay: { name: "Dr. Abhay", title: "Your Health Companion", voiceGender: "male" },
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
  const [consultationActive, setConsultationActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ logged: any[] } | null>(null);
  const [lang, setLang] = useState("en-IN");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<VapiTranscriptMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finalMessagesRef = useRef<VapiTranscriptMessage[]>([]);
  const endingRef = useRef(false);

  const patientGender = (session?.patient as any)?.gender;
  const personaKey = getPersonaForGender(patientGender);
  const persona = PERSONAS[personaKey];

  const handleCallEnd = useCallback((msgs: VapiTranscriptMessage[]) => {
    finalMessagesRef.current = msgs;
  }, []);

  const handleError = useCallback((msg: string) => {
    toast({ title: "Voice error", description: msg, variant: "destructive" });
  }, [toast]);

  const vapiCall = useVapiCall({
    publicKey: VAPI_PUBLIC_KEY,
    onTranscriptUpdate: setDisplayMessages,
    onError: handleError,
    onCallEnd: handleCallEnd,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const endConsultation = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    vapiCall.stopCall();
    setConsultationActive(false);
    setSaving(true);
    const msgs = finalMessagesRef.current.length > 0 ? finalMessagesRef.current : displayMessages;
    try {
      const durationSec = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      const result = (await api.post("me/voice-conversation/save", {
        messages: msgs.map((m) => ({ role: m.role, content: m.content })),
        persona: personaKey,
        duration_seconds: durationSec,
        lang,
      })) as { logged: any[]; extracted_actions: any[] };
      setSaveResult({ logged: result.logged || [] });
      queryClient.invalidateQueries({ queryKey: ["me", "vitals"] });
      queryClient.invalidateQueries({ queryKey: ["me", "food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["me", "rewards"] });
      queryClient.invalidateQueries({ queryKey: ["me", "gamification"] });
      queryClient.invalidateQueries({ queryKey: ["me", "quick-log", "last"] });
      queryClient.invalidateQueries({ queryKey: ["me", "overview"] });
      toast({
        title: "Consultation saved",
        description:
          result.logged?.length > 0
            ? `${result.logged.length} health item${result.logged.length > 1 ? "s" : ""} auto-logged`
            : "Transcript saved to your records",
      });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
    endingRef.current = false;
  }, [vapiCall, displayMessages, startTime, personaKey, lang, toast, queryClient]);

  // Auto-save when Vapi ends the call (timeout, network drop, etc.)
  useEffect(() => {
    if (vapiCall.phase === "ended" && consultationActive) {
      endConsultation();
    }
  }, [vapiCall.phase, consultationActive, endConsultation]);

  const startConsultation = async () => {
    setSaveResult(null);
    setDisplayMessages([]);
    setStartTime(Date.now());
    setConsultationActive(true);
    setIsMuted(false);
    finalMessagesRef.current = [];
    endingRef.current = false;
    try {
      const config = await api.get<{
        systemPrompt: string;
        firstMessage: string;
        personaName: string;
        personaGender: string;
        medKeywords?: string[];
      }>("me/voice-doctor-config", { persona: personaKey, lang });
      await vapiCall.startCall({
        systemPrompt: config.systemPrompt,
        firstMessage: config.firstMessage,
        voiceGender: persona.voiceGender,
        lang: lang || "en-IN",
        extraKeywords: config.medKeywords,
      });
    } catch (err) {
      toast({ title: "Could not start call", description: (err as Error).message, variant: "destructive" });
      setConsultationActive(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    vapiCall.setMuted(next);
  };

  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label || "English";
  const showControls = consultationActive && !saving;
  const showInitial = !consultationActive && displayMessages.length === 0 && !saveResult && !saving;
  const isConnecting = vapiCall.phase === "connecting";
  const isListening = vapiCall.phase === "listening";
  const isSpeaking = vapiCall.phase === "speaking";

  return (
    <div className="flex flex-col h-full max-h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white voice-header py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold leading-tight truncate">{persona.name}</h1>
            <p className="text-[11px] sm:text-xs text-white/70">{persona.title}</p>
          </div>
          {consultationActive && (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 flex-shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnecting
                    ? "bg-white/60 animate-pulse"
                    : isListening
                    ? "bg-emerald-300 animate-pulse"
                    : isSpeaking
                    ? "bg-yellow-300 animate-pulse"
                    : "bg-white/60 animate-pulse"
                }`}
              />
              <span className="text-[11px] sm:text-xs font-medium text-white/90">
                {isConnecting ? "Connecting" : isListening ? "Listening" : isSpeaking ? "Speaking" : "Active"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 pwa-scroll">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* No Vapi key warning */}
          {!VAPI_PUBLIC_KEY && showInitial && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">Vapi not configured</p>
                <p className="text-muted-foreground mt-1">
                  Add <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_VAPI_PUBLIC_KEY</code> to your{" "}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env</code> file. Get your key from{" "}
                  <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    dashboard.vapi.ai
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

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
                  {persona.name} will ask about your vitals, meals, medications &amp; well-being. Everything is
                  auto-logged to your records.
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Powered by Vapi Voice AI</p>
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
                          onClick={() => {
                            setLang(l.code);
                            setShowLangPicker(false);
                          }}
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
                disabled={!VAPI_PUBLIC_KEY}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-base shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="w-5 h-5" />
                Start Consultation
              </button>
            </div>
          )}

          {/* Connecting state */}
          {isConnecting && displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Connecting to {persona.name}...</p>
            </div>
          )}

          {displayMessages.map((msg, i) => (
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

          {/* Saving indicator */}
          {saving && (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving consultation...
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
                  {saveResult.logged.map((item: any, i: number) => (
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
                <p className="text-sm text-muted-foreground pl-10">
                  Conversation saved. No specific health data to log this time.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setDisplayMessages([]);
                  setSaveResult(null);
                }}
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

      {/* Bottom controls */}
      {showControls && (
        <div className="flex-shrink-0 border-t border-teal-500/10 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm voice-controls py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 sm:gap-5">
            <div className="relative">
              <button
                type="button"
                onClick={toggleMute}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all touch-manipulation ${
                  isMuted
                    ? "bg-red-500/10 text-red-500 ring-2 ring-red-500/30"
                    : isListening
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30 scale-110 ring-4 ring-teal-500/20"
                    : "bg-muted text-muted-foreground hover:bg-teal-500/10 hover:text-teal-600 shadow-md"
                }`}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </button>
              {isListening && !isMuted && vapiCall.volumeLevel > 0.1 && (
                <div
                  className="absolute inset-0 rounded-full border-2 border-teal-400/50 animate-ping pointer-events-none"
                  style={{ animationDuration: "1.5s" }}
                />
              )}
            </div>
            <button
              type="button"
              onClick={endConsultation}
              disabled={displayMessages.length < 1}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all touch-manipulation shadow-md hover:shadow-lg disabled:opacity-40 disabled:shadow-none"
              aria-label="End consultation"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 sm:mt-2.5 px-4">
            {isConnecting ? (
              "Connecting..."
            ) : isMuted ? (
              <span className="text-red-500 font-medium">Muted — tap mic to unmute</span>
            ) : isListening ? (
              <span className="text-teal-600 dark:text-teal-400 font-medium">
                Listening... Speak now ({langLabel})
              </span>
            ) : isSpeaking ? (
              <span className="text-emerald-600 dark:text-emerald-400">{persona.name} is speaking...</span>
            ) : (
              "Active call"
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientAIDoctor;
