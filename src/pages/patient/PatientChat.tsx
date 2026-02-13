import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, getStoredToken } from "@/lib/api";
import { Send, Heart, Shield, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const VITAL_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { value: "temperature", label: "Temperature", unit: "°F" },
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
  { value: "spo2", label: "SpO2", unit: "%" },
];

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

type Msg = { role: "user" | "assistant"; content: string };

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const PatientChat = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({ vital_type: "heart_rate", value: "", bp_upper: "", bp_lower: "", notes: "" });
  const [mealForm, setMealForm] = useState({ meal_type: "lunch", notes: "" });
  const [savingVital, setSavingVital] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  useEffect(() => {
    const p = session?.patient as { full_name?: string } | undefined;
    if (p?.full_name) setPatientName(p.full_name.split(" ")[0] || "");
  }, [session?.patient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let assistantSoFar = "";

    try {
      const token = getStoredToken();
      const resp = await fetch(`${API_BASE}/chat/patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to connect" }));
        toast({ title: "Error", description: err.error || "Something went wrong", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const upsertAssistant = (nextChunk: string) => {
        assistantSoFar += nextChunk;
        const content = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    }

    setIsLoading(false);
  };

  const handleLogVital = async () => {
    const isBp = vitalForm.vital_type === "blood_pressure";
    if (isBp ? !vitalForm.bp_upper.trim() || !vitalForm.bp_lower.trim() : !vitalForm.value.trim()) {
      toast({ title: "Enter a value", variant: "destructive" });
      return;
    }
    setSavingVital(true);
    try {
      const vitalInfo = VITAL_TYPES.find((t) => t.value === vitalForm.vital_type);
      const isBp = vitalForm.vital_type === "blood_pressure";
      const valueText = isBp ? `${vitalForm.bp_upper.trim()}/${vitalForm.bp_lower.trim()}` : vitalForm.value.trim();
      const numericVal = isBp ? parseFloat(vitalForm.bp_upper) : parseFloat(vitalForm.value);
      await api.post("me/vitals", {
        vital_type: vitalForm.vital_type,
        value_text: valueText,
        value_numeric: Number.isFinite(numericVal) ? numericVal : undefined,
        unit: vitalInfo?.unit || undefined,
        notes: vitalForm.notes.trim() || undefined,
      });
      toast({ title: "Vital recorded" });
      setShowVitalModal(false);
      setVitalForm({ vital_type: "heart_rate", value: "", bp_upper: "", bp_lower: "", notes: "" });
    } catch (e) {
      toast({ title: "Failed to log vital", description: (e as Error).message, variant: "destructive" });
    }
    setSavingVital(false);
  };

  const handleLogMeal = async () => {
    setSavingMeal(true);
    try {
      await api.post("me/food_logs", {
        meal_type: mealForm.meal_type,
        notes: mealForm.notes.trim() || undefined,
        food_items: mealForm.notes.trim() ? [{ name: mealForm.notes.trim() }] : undefined,
      });
      toast({ title: "Meal logged" });
      setShowMealModal(false);
      setMealForm({ meal_type: "lunch", notes: "" });
    } catch (e) {
      toast({ title: "Failed to log meal", description: (e as Error).message, variant: "destructive" });
    }
    setSavingMeal(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen w-full flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-heading font-bold text-foreground">Mediimate AI</span>
          </div>
        </div>
        <Link
          to="/patient/overview"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Go To Dashboard
        </Link>
      </header>

      {/* Chat Area - full height */}
      <div className="flex-1 flex flex-col min-h-0">
        {!hasMessages ? (
          /* Empty state - vertically centered greeting + input */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-light text-muted-foreground/40 mb-10 text-center">
              How are you feeling today{patientName ? `, ${patientName}` : ""}?
            </h1>

            {/* Large centered input */}
            <div className="w-full max-w-3xl">
              <div className="relative border border-border/60 rounded-3xl bg-card shadow-lg focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask anything about your symptoms, treatment or health"
                  rows={2}
                  className="w-full resize-none bg-transparent pl-5 pr-16 py-5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Quick action chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  { label: "💊 My medications", query: "What medications am I currently taking?" },
                  { label: "📅 Next appointment", query: "When is my next appointment?" },
                  { label: "🧪 Latest lab results", query: "Show me my latest lab results" },
                  { label: "❤️ My vitals", query: "How are my recent vitals looking?" },
                  { label: "📋 My conditions", query: "What conditions do I have on record?" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => send(chip.query)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowVitalModal(true)}
                  className="px-3 py-1.5 text-xs rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  ➕ Log a vital
                </button>
                <button
                  onClick={() => setShowMealModal(true)}
                  className="px-3 py-1.5 text-xs rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  ➕ Log my meal
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/50">
                <Shield className="w-3 h-3" />
                <span>HIPAA Compliant · Encrypted & Private</span>
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick actions when in chat - Log vital / Log meal */}
            <div className="flex flex-wrap justify-center gap-2 px-4 pb-2">
              <button
                onClick={() => setShowVitalModal(true)}
                className="px-3 py-1.5 text-xs rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
              >
                ➕ Log a vital
              </button>
              <button
                onClick={() => setShowMealModal(true)}
                className="px-3 py-1.5 text-xs rounded-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
              >
                ➕ Log my meal
              </button>
            </div>

            {/* Input at bottom when chatting */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border/30">
              <div className="max-w-3xl mx-auto relative border border-border rounded-2xl bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask anything about your symptoms, treatment or health"
                  rows={1}
                  className="w-full resize-none bg-transparent pl-4 pr-14 py-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 bottom-3 w-9 h-9 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log vital modal */}
      <Dialog open={showVitalModal} onOpenChange={setShowVitalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a vital</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Type</Label>
              <select
                value={vitalForm.vital_type}
                onChange={(e) => setVitalForm((f) => ({ ...f, vital_type: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                {VITAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label} ({t.unit})</option>
                ))}
              </select>
            </div>
            {vitalForm.vital_type === "blood_pressure" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Upper (Systolic) mmHg *</Label>
                  <Input
                    type="number"
                    min={60}
                    max={250}
                    placeholder="120"
                    value={vitalForm.bp_upper}
                    onChange={(e) => setVitalForm((f) => ({ ...f, bp_upper: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Lower (Diastolic) mmHg *</Label>
                  <Input
                    type="number"
                    min={40}
                    max={150}
                    placeholder="80"
                    value={vitalForm.bp_lower}
                    onChange={(e) => setVitalForm((f) => ({ ...f, bp_lower: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label>Value *</Label>
                <Input
                  type="text"
                  placeholder="e.g. 72"
                  value={vitalForm.value}
                  onChange={(e) => setVitalForm((f) => ({ ...f, value: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any context"
                value={vitalForm.notes}
                onChange={(e) => setVitalForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVitalModal(false)}>Cancel</Button>
            <Button
              onClick={handleLogVital}
              disabled={
                savingVital ||
                (vitalForm.vital_type === "blood_pressure"
                  ? !vitalForm.bp_upper.trim() || !vitalForm.bp_lower.trim()
                  : !vitalForm.value.trim())
              }
            >
              {savingVital ? "Saving..." : "Save vital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log meal modal */}
      <Dialog open={showMealModal} onOpenChange={setShowMealModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log my meal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Meal type</Label>
              <select
                value={mealForm.meal_type}
                onChange={(e) => setMealForm((f) => ({ ...f, meal_type: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                {MEAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>What did you eat? (optional)</Label>
              <Textarea
                placeholder="e.g. Rice, dal, vegetables"
                value={mealForm.notes}
                onChange={(e) => setMealForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMealModal(false)}>Cancel</Button>
            <Button onClick={handleLogMeal} disabled={savingMeal}>
              {savingMeal ? "Saving..." : "Log meal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientChat;
