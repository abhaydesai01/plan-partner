import { useState, useRef, useCallback, useEffect } from "react";

// ---- Multi-language sentence splitter ----
// Handles English (.!?), Hindi/Marathi/Kannada etc. purna viram, comma breaks
const SENTENCE_END = /[.!?\u0964\u0965\u0950;:]\s*/g; // . ! ? | (devanagari danda) || (double danda)

function splitIntoChunks(text: string, maxLen = 100): string[] {
  if (text.length <= maxLen) return [text.trim()].filter(Boolean);

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining.trim());
      break;
    }

    // Find the last sentence-end within maxLen
    let splitAt = -1;
    SENTENCE_END.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SENTENCE_END.exec(remaining)) !== null) {
      const end = m.index + m[0].length;
      if (end <= maxLen) splitAt = end;
      else break;
    }

    // If no sentence-end, try splitting at comma or space
    if (splitAt <= 0) {
      const commaIdx = remaining.lastIndexOf(",", maxLen);
      if (commaIdx > 20) {
        splitAt = commaIdx + 1;
      } else {
        const spaceIdx = remaining.lastIndexOf(" ", maxLen);
        splitAt = spaceIdx > 10 ? spaceIdx + 1 : maxLen;
      }
    }

    const chunk = remaining.slice(0, splitAt).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter(Boolean);
}

// ---- Voice gender matching ----
const FEMALE_NAMES = /samantha|victoria|karen|moira|tessa|fiona|veena|lekha|nicky|allison|ava|susan|kate|zira|hazel|jenny|aria|google.*female|microsoft.*zira|cortana/i;
const MALE_NAMES = /\brishi\b|daniel|david|james|mark|alex|fred|tom|jorge|aaron|guy|lee|google.*male|microsoft.*david/i;

function findVoiceByGender(pool: SpeechSynthesisVoice[], gender: "male" | "female"): SpeechSynthesisVoice | null {
  const wanted = gender === "female" ? FEMALE_NAMES : MALE_NAMES;
  const unwanted = gender === "female" ? MALE_NAMES : FEMALE_NAMES;
  const exact = pool.find((v) => wanted.test(v.name) && !unwanted.test(v.name));
  if (exact) return exact;
  const notOpposite = pool.find((v) => !unwanted.test(v.name));
  if (notOpposite) return notOpposite;
  return null;
}

// ---- Chrome keepalive workaround ----
// Chrome kills speechSynthesis utterances after ~15 seconds of continuous speech.
// Pausing and immediately resuming resets the timer without audible interruption.
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
function startKeepAlive() {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
}
function stopKeepAlive() {
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
}

export function useVoiceOutput(opts?: { voiceGender?: "male" | "female"; lang?: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const voicesLoadedRef = useRef(false);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const lang = opts?.lang || "en";
    const gender = opts?.voiceGender || "female";
    const baseLang = lang.split("-")[0];

    // Build pools from narrow (exact locale) to broad (any voice)
    const exactLocale = voices.filter((v) => v.lang.replace("_", "-").startsWith(lang));
    const broadLang = voices.filter((v) => v.lang.replace("_", "-").startsWith(baseLang));
    const englishVoices = voices.filter((v) => v.lang.replace("_", "-").startsWith("en"));
    const allVoices = voices;

    // For non-English: prefer locale voice of ANY gender over wrong-locale voice
    // (a Kannada male voice is better than an English female for Kannada text)
    if (baseLang !== "en") {
      // 1. Try exact locale with correct gender
      for (const pool of [exactLocale, broadLang]) {
        if (pool.length === 0) continue;
        const match = findVoiceByGender(pool, gender);
        if (match) return match;
      }
      // 2. Try exact locale with ANY gender (still better than English)
      if (exactLocale.length > 0) return exactLocale[0];
      if (broadLang.length > 0) return broadLang[0];
      // 3. Fall back to English with correct gender
      const engMatch = findVoiceByGender(englishVoices.length > 0 ? englishVoices : allVoices, gender);
      if (engMatch) return engMatch;
    } else {
      // English: prioritize gender
      for (const pool of [exactLocale, broadLang, allVoices]) {
        if (pool.length === 0) continue;
        const match = findVoiceByGender(pool, gender);
        if (match) return match;
      }
    }

    return voices[0] || null;
  }, [opts?.voiceGender, opts?.lang, supported]);

  const processQueue = useCallback(() => {
    if (!supported || speakingRef.current || queueRef.current.length === 0) {
      if (queueRef.current.length === 0) stopKeepAlive();
      return;
    }
    const text = queueRef.current.shift()!;
    speakingRef.current = true;
    setIsSpeaking(true);

    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else if (opts?.lang) {
      utter.lang = opts.lang;
    }

    // Slower rate for non-English for clarity; slight pitch shift for gender
    const isEnglish = (opts?.lang || "en").startsWith("en");
    utter.rate = isEnglish ? 0.95 : 0.88;
    utter.pitch = opts?.voiceGender === "male" ? 0.85 : 1.12;
    utter.volume = 1.0;

    const onDone = () => {
      speakingRef.current = false;
      if (queueRef.current.length > 0) {
        // Small gap between chunks for natural breathing rhythm
        setTimeout(() => processQueue(), 80);
      } else {
        stopKeepAlive();
        setIsSpeaking(false);
      }
    };

    utter.onend = onDone;
    utter.onerror = (e) => {
      if (e.error !== "interrupted") console.warn("TTS error:", e.error);
      onDone();
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [supported, pickVoice, opts?.voiceGender, opts?.lang]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      const chunks = splitIntoChunks(text, 100);
      queueRef.current.push(...chunks);
      startKeepAlive();
      processQueue();
    },
    [supported, processQueue]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    stopKeepAlive();
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, [supported]);

  useEffect(() => {
    return () => {
      stopKeepAlive();
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  // Pre-load voices
  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voicesLoadedRef.current = true;
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  return { speak, stop, isSpeaking, supported };
}
