import { useState, useRef, useCallback, useEffect } from "react";

// ---- Multi-language sentence splitter ----
const SENTENCE_END = /[.!?\u0964\u0965\u0950;:]\s*/g;

function splitIntoChunks(text: string, maxLen = 120): string[] {
  if (text.length <= maxLen) return [text.trim()].filter(Boolean);

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining.trim());
      break;
    }

    let splitAt = -1;
    SENTENCE_END.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SENTENCE_END.exec(remaining)) !== null) {
      const end = m.index + m[0].length;
      if (end <= maxLen) splitAt = end;
      else break;
    }

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

// ---- iOS/PWA audio unlock ----
let audioUnlocked = false;
export function unlockTTSAudio() {
  if (audioUnlocked) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(" ");
    utter.volume = 0.01;
    utter.rate = 10;
    utter.onend = () => { audioUnlocked = true; };
    utter.onerror = () => { audioUnlocked = true; };
    window.speechSynthesis.speak(utter);
    audioUnlocked = true;
  } catch { /* ignore */ }
}

// Auto-unlock on first user interaction (covers all PWA/iOS scenarios)
if (typeof window !== "undefined") {
  const autoUnlock = () => {
    unlockTTSAudio();
    document.removeEventListener("click", autoUnlock, true);
    document.removeEventListener("touchstart", autoUnlock, true);
    document.removeEventListener("touchend", autoUnlock, true);
  };
  document.addEventListener("click", autoUnlock, true);
  document.addEventListener("touchstart", autoUnlock, true);
  document.addEventListener("touchend", autoUnlock, true);
}

export function useVoiceOutput(opts?: { voiceGender?: "male" | "female"; lang?: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const voicesLoadedRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const lang = opts?.lang || "en";
    const gender = opts?.voiceGender || "female";
    const baseLang = lang.split("-")[0];

    const exactLocale = voices.filter((v) => v.lang.replace("_", "-").startsWith(lang));
    const broadLang = voices.filter((v) => v.lang.replace("_", "-").startsWith(baseLang));
    const englishVoices = voices.filter((v) => v.lang.replace("_", "-").startsWith("en"));
    const allVoices = voices;

    if (baseLang !== "en") {
      for (const pool of [exactLocale, broadLang]) {
        if (pool.length === 0) continue;
        const match = findVoiceByGender(pool, gender);
        if (match) return match;
      }
      if (exactLocale.length > 0) return exactLocale[0];
      if (broadLang.length > 0) return broadLang[0];
      const engMatch = findVoiceByGender(englishVoices.length > 0 ? englishVoices : allVoices, gender);
      if (engMatch) return engMatch;
    } else {
      for (const pool of [exactLocale, broadLang, allVoices]) {
        if (pool.length === 0) continue;
        const match = findVoiceByGender(pool, gender);
        if (match) return match;
      }
    }

    return voices[0] || null;
  }, [opts?.voiceGender, opts?.lang, supported]);

  const speakOneChunk = useCallback((text: string, onFinished: () => void) => {
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else if (opts?.lang) {
      utter.lang = opts.lang;
    }

    const isEnglish = (opts?.lang || "en").startsWith("en");
    utter.rate = isEnglish ? 0.95 : 0.88;
    utter.pitch = opts?.voiceGender === "male" ? 0.85 : 1.12;
    utter.volume = 1.0;

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      onFinished();
    };

    utter.onend = done;
    utter.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (e.error !== "interrupted") console.warn("TTS error:", e.error);
      done();
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);

    // Watchdog: force-advance if onend never fires (iOS bug)
    const estimatedMs = Math.max(6000, text.length * 120);
    watchdogRef.current = setTimeout(() => {
      if (!finished) done();
    }, estimatedMs);
  }, [pickVoice, opts?.voiceGender, opts?.lang]);

  const processQueue = useCallback(() => {
    if (!supported || queueRef.current.length === 0) {
      stopKeepAlive();
      speakingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    const text = queueRef.current.shift()!;
    speakingRef.current = true;
    setIsSpeaking(true);

    speakOneChunk(text, () => {
      if (queueRef.current.length > 0) {
        setTimeout(() => processQueue(), 100);
      } else {
        stopKeepAlive();
        speakingRef.current = false;
        setIsSpeaking(false);
      }
    });
  }, [supported, speakOneChunk]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;

      // Clear any previous playback
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }

      const chunks = splitIntoChunks(text, 120);
      queueRef.current = [...chunks];
      startKeepAlive();

      // On iOS, voices may not be loaded yet. Wait briefly if needed.
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0 && !voicesLoadedRef.current) {
        let attempts = 0;
        const waitForVoices = () => {
          attempts++;
          const v = window.speechSynthesis.getVoices();
          if (v.length > 0 || attempts > 10) {
            if (v.length > 0) voicesLoadedRef.current = true;
            processQueue();
            return;
          }
          setTimeout(waitForVoices, 150);
        };
        setTimeout(waitForVoices, 150);
      } else {
        // Small delay after cancel to let iOS audio session settle
        setTimeout(() => processQueue(), 60);
      }
    },
    [supported, processQueue]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    stopKeepAlive();
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, [supported]);

  useEffect(() => {
    return () => {
      stopKeepAlive();
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
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
