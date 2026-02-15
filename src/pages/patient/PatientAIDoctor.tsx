import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, getStoredToken, api } from "@/lib/api";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { Phone, PhoneOff, Mic, MicOff, Volume2, User, Loader2, CheckCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const PERSONAS: Record<string, { name: string; title: string; voiceGender: "male" | "female"; gradient: string }> = {
  dr_priya: {
    name: "Dr. Priya",
    title: "Your Health Companion",
    voiceGender: "female",
    gradient: "from-pink-500 to-rose-600",
  },
  dr_abhay: {
    name: "Dr. Abhay",
    title: "Your Health Companion",
    voiceGender: "male",
    gradient: "from-blue-500 to-indigo-600",
  },
};

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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "ended">("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ logged: any[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const patientGender = (session?.patient as any)?.gender;
  const personaKey = getPersonaForGender(patientGender);
  const persona = PERSONAS[personaKey];

  const voiceOutput = useVoiceOutput({ voiceGender: persona.voiceGender });

  const sendToAI = useCallback(async (allMessages: Msg[]) => {
    setStatus("processing");
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
        body: JSON.stringify({ messages: allMessages, persona: personaKey }),
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
        setStatus("speaking");
        voiceOutput.speak(assistantText.trim());
      }
    } catch {
      toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
      setStatus("idle");
    }
    setIsLoading(false);
  }, [personaKey, toast, voiceOutput]);

  const voiceInput = useVoiceInput({
    onFinalTranscript: (text) => {
      if (text.trim() && status !== "ended") {
        const userMsg: Msg = { role: "user", content: text };
        setMessages((prev) => {
          const updated = [...prev, userMsg];
          sendToAI(updated);
          return updated;
        });
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When TTS finishes speaking, go back to listening
  useEffect(() => {
    if (status === "speaking" && !voiceOutput.isSpeaking && !isLoading) {
      if (voiceInput.supported) {
        setStatus("listening");
        voiceInput.startListening();
      } else {
        setStatus("idle");
      }
    }
  }, [voiceOutput.isSpeaking, status, isLoading, voiceInput]);

  const startConsultation = () => {
    setStartTime(Date.now());
    setMessages([]);
    setSaveResult(null);
    setStatus("processing");
    const greeting: Msg = { role: "user", content: "Hello doctor, I'm here for my daily check-in." };
    setMessages([greeting]);
    sendToAI([greeting]);
  };

  const endConsultation = async () => {
    voiceInput.stopListening();
    voiceOutput.stop();
    setStatus("ended");
    setSaving(true);
    try {
      const durationSec = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      const result = await api.post("me/voice-conversation/save", {
        messages,
        persona: personaKey,
        duration_seconds: durationSec,
      }) as { logged: any[]; extracted_actions: any[] };
      setSaveResult({ logged: result.logged || [] });
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
      setStatus("idle");
    } else {
      voiceOutput.stop();
      setStatus("listening");
      voiceInput.startListening();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[100dvh] bg-background">
      {/* Header */}
      <div className={`flex-shrink-0 bg-gradient-to-r ${persona.gradient} text-white px-4 py-4 sm:px-6`}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{persona.name}</h1>
            <p className="text-sm text-white/80">{persona.title}</p>
          </div>
          {status !== "idle" && status !== "ended" && (
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/80">
                {status === "listening" ? "Listening" : status === "speaking" ? "Speaking" : "Thinking..."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {status === "idle" && messages.length === 0 && !saveResult && (
            <div className="text-center py-16 space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-r ${persona.gradient} flex items-center justify-center`}>
                <Phone className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-bold text-foreground">{persona.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">Daily health check-in consultation</p>
                <p className="text-xs text-muted-foreground mt-3 max-w-sm mx-auto">
                  {persona.name} will ask about your vitals, meals, medications, and how you are feeling.
                  Everything discussed will be auto-logged to your health records.
                </p>
              </div>
              <button
                type="button"
                onClick={startConsultation}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${persona.gradient} text-white font-semibold text-base shadow-lg hover:shadow-xl transition-shadow touch-manipulation`}
              >
                <Phone className="w-5 h-5" />
                Start Consultation
              </button>
              {!voiceInput.supported && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Voice input is not supported in your browser. Please use Chrome or Edge for voice features.
                </p>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
              {msg.role === "assistant" && (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${persona.gradient} flex items-center justify-center flex-shrink-0 mt-1`}>
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start gap-2">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${persona.gradient} flex items-center justify-center flex-shrink-0`}>
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {voiceInput.isListening && voiceInput.interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-primary/20 text-primary rounded-br-md italic">
                {voiceInput.interimTranscript}...
              </div>
            </div>
          )}

          {/* Save result */}
          {saveResult && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">Consultation Complete</span>
              </div>
              {saveResult.logged.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Auto-logged to your health records:</p>
                  {saveResult.logged.map((item, i) => (
                    <div key={i} className="text-sm text-foreground flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {item.type === "blood_pressure" && `BP: ${item.value}`}
                      {item.type === "blood_sugar" && `Blood Sugar: ${item.value}`}
                      {item.type === "food" && `Meal: ${item.meal_type}${item.notes ? ` - ${item.notes}` : ""}`}
                      {item.type === "medication" && `Medication: ${item.medication_name || "taken"}`}
                      {item.type === "symptom" && `Symptom: ${item.description}`}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Conversation saved. No specific health data to log this time.</p>
              )}
              <button
                type="button"
                onClick={() => { setStatus("idle"); setMessages([]); setSaveResult(null); }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Start a new consultation
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom controls */}
      {status !== "idle" && status !== "ended" && (
        <div className="flex-shrink-0 border-t border-border bg-background px-4 py-4 pwa-input-bottom">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={toggleMic}
              disabled={isLoading || voiceOutput.isSpeaking}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all touch-manipulation shadow-lg ${
                voiceInput.isListening
                  ? "bg-red-500 text-white animate-pulse scale-110"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              } disabled:opacity-40`}
              aria-label={voiceInput.isListening ? "Stop" : "Speak"}
            >
              {voiceInput.isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <button
              type="button"
              onClick={endConsultation}
              disabled={saving || messages.length < 2}
              className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors touch-manipulation shadow-lg disabled:opacity-40"
              aria-label="End consultation"
            >
              {saving ? <Loader2 className="w-7 h-7 animate-spin" /> : <PhoneOff className="w-7 h-7" />}
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {voiceInput.isListening ? "Listening... Speak now" : voiceOutput.isSpeaking ? `${persona.name} is speaking...` : isLoading ? "Thinking..." : "Tap mic to speak"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientAIDoctor;
