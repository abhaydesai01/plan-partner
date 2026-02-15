import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceOutput(opts?: { voiceGender?: "male" | "female"; lang?: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices();
    const lang = opts?.lang || "en-IN";
    const gender = opts?.voiceGender || "female";
    const langVoices = voices.filter((v) => v.lang.startsWith(lang.split("-")[0]));
    const pool = langVoices.length > 0 ? langVoices : voices;
    if (gender === "female") {
      const female =
        pool.find((v) => /female|woman|zira|samantha|google.*female|priya|veena|rishi/i.test(v.name) && !(/male/i.test(v.name) && !/female/i.test(v.name))) ||
        pool.find((v) => !/male|david|daniel|james|mark/i.test(v.name));
      return female || pool[0] || null;
    }
    const male =
      pool.find((v) => /\bmale\b|man|david|daniel|james|mark|ravi|google.*male/i.test(v.name)) ||
      pool.find((v) => !/female|woman|zira|samantha/i.test(v.name));
    return male || pool[0] || null;
  }, [opts?.voiceGender, opts?.lang, supported]);

  const processQueue = useCallback(() => {
    if (!supported || speakingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift()!;
    speakingRef.current = true;
    setIsSpeaking(true);

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = pickVoice();
    utter.rate = 1.0;
    utter.pitch = opts?.voiceGender === "male" ? 0.9 : 1.1;
    utter.onend = () => {
      speakingRef.current = false;
      if (queueRef.current.length > 0) {
        processQueue();
      } else {
        setIsSpeaking(false);
      }
    };
    utter.onerror = () => {
      speakingRef.current = false;
      if (queueRef.current.length > 0) {
        processQueue();
      } else {
        setIsSpeaking(false);
      }
    };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [supported, pickVoice, opts?.voiceGender]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      queueRef.current.push(text);
      processQueue();
    },
    [supported, processQueue]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  // Pre-load voices
  useEffect(() => {
    if (supported && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, [supported]);

  return { speak, stop, isSpeaking, supported };
}
