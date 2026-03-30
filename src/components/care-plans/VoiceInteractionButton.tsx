import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export function VoiceInteractionButton({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // We can concurrently execute log-actions based on the Voice Transcript JSON array
  const actionMut = useMutation({
    mutationFn: async (intents: any[]) => {
      // Execute serially so we don't spam the DB causing parallel race conditions for points
      for (const intent of intents) {
        await api.post(`me/careplan/${assignmentId}/log-action`, intent);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "careplan"] });
      qc.invalidateQueries({ queryKey: ["me", "gamification"] });
      qc.invalidateQueries({ queryKey: ["me", "vitals"] });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success("Voice Log Processed", { description: "Your dashboard has been automatically updated!" });
    },
    onError: () => {
      toast.error("Failed to map voice actions. Please try again or log manually.");
    }
  });

  const uploadAudioMut = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voicelog.webm");
      const res = await api.upload<any>(`me/careplan/${assignmentId}/voice-log`, formData);
      return res;
    },
    onMutate: () => setIsProcessing(true),
    onSuccess: (data) => {
      if (data.intents && data.intents.length > 0) {
        toast.info(`Transcribed ${data.intents.length} actions. Updating dashboard...`);
        actionMut.mutate(data.intents, {
          onSettled: () => setIsProcessing(false)
        });
      } else {
        setIsProcessing(false);
        toast.warning("No actions recognized in the audio.", { description: "Try speaking more clearly or mentioning specific tasks like 'I took my medicine' or 'My sugar is 115'." });
      }
    },
    onError: () => {
      setIsProcessing(false);
      toast.error("Failed to transcribe audio.");
    }
  });

  const constructRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        uploadAudioMut.mutate(audioBlob);
        stream.getTracks().forEach(t => t.stop()); // kill mic
      };

      mediaRecorderRef.current = mediaRecorder;
      return mediaRecorder;
    } catch (e: any) {
      toast.error("Microphone Access Denied", { description: "Please allow microphone permissions." });
      return null;
    }
  };

  const toggleRecording = async () => {
    if (isProcessing) return; // Prevent clicks while parsing

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const recorder = await constructRecorder();
      if (recorder) {
        recorder.start();
        setIsRecording(true);
      }
    }
  };

  return (
    <div className="flex justify-center items-center w-full my-4 relative">
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-lg ${
          isProcessing ? "bg-slate-200 cursor-wait shadow-none" :
          isRecording ? "bg-red-500 scale-110 shadow-red-500/40 animate-pulse" : "bg-emerald-500 hover:bg-emerald-600 hover:scale-105 shadow-emerald-500/30"
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        ) : isRecording ? (
          <Square className="w-6 h-6 text-white fill-white" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}
      </button>

      {/* Helper Context Menu */}
      <div className="absolute top-20 text-center pointer-events-none">
        {isRecording && <p className="text-red-500 text-sm font-bold animate-pulse">Recording...</p>}
        {isProcessing && <p className="text-slate-500 text-sm font-medium animate-pulse">Analyzing Voice...</p>}
      </div>
    </div>
  );
}
