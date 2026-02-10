import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Send, Heart, Shield, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-chat`;

const PatientChat = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("patients")
      .select("full_name")
      .eq("patient_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPatientName(data.full_name.split(" ")[0]);
      });
  }, [user]);

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
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
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
            <span className="font-heading font-bold text-foreground">FlyCure AI</span>
          </div>
        </div>
        <a
          href="/patient/overview"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Go To Dashboard
        </a>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {!hasMessages ? (
          /* Empty state - centered greeting */
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-light text-muted-foreground/60 mb-8 text-center">
              How are you feeling today{patientName ? `, ${patientName}` : ""}?
            </h1>
          </div>
        ) : (
          /* Messages */
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
        )}

        {/* Input Area */}
        <div className={`px-4 ${hasMessages ? "pb-4" : "pb-8"}`}>
          <div className="relative border border-border rounded-2xl bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
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

          {/* Quick action chips */}
          {!hasMessages && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
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
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground/50">
            <Shield className="w-3 h-3" />
            <span>Encrypted & Private · Not medical advice</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientChat;
