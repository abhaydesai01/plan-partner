import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Stethoscope, Zap, Heart, Check, AlertTriangle, Loader2 } from "lucide-react";

type Screened = {
  eye?: boolean;
  kidney?: boolean;
  nerve?: boolean;
  heart?: boolean;
};

const TILES = [
  { type: "eye" as const, label: "Eye", icon: Eye, color: "text-blue-600 bg-blue-50 border-blue-200", question: "Have you noticed any blurry vision, floaters, or difficulty seeing at night?" },
  { type: "kidney" as const, label: "Kidney", icon: Stethoscope, color: "text-purple-600 bg-purple-50 border-purple-200", question: "Do you experience foamy urine, swelling in ankles/feet, or persistent fatigue?" },
  { type: "nerve" as const, label: "Nerve", icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200", question: "Do you feel numbness, tingling, or burning sensations in your hands or feet?" },
  { type: "heart" as const, label: "Heart", icon: Heart, color: "text-rose-600 bg-rose-50 border-rose-200", question: "Have you experienced chest pain, breathlessness, or unusual fatigue during activity?" },
];

export function ComplicationTiles({
  assignmentId,
  screened,
}: {
  assignmentId: string;
  screened: Screened;
}) {
  const qc = useQueryClient();
  const [openType, setOpenType] = useState<string | null>(null);
  const [answer, setAnswer] = useState<"no" | "yes" | null>(null);

  const screenMut = useMutation({
    mutationFn: (body: { type: string; response: string; concerning: boolean }) =>
      api.post(`me/careplan/${assignmentId}/screen-complication`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "careplan"] });
      setOpenType(null);
      setAnswer(null);
    },
  });

  const handleSubmit = () => {
    if (!openType || !answer) return;
    screenMut.mutate({ type: openType, response: answer, concerning: answer === "yes" });
  };

  const tile = TILES.find((t) => t.type === openType);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Complication Screening</p>
      <div className="grid grid-cols-2 gap-2">
        {TILES.map((t) => {
          const Icon = t.icon;
          const done = screened[t.type];
          return (
            <button
              key={t.type}
              className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all text-left ${done ? "bg-green-50 border-green-200" : t.color + " hover:shadow-sm cursor-pointer"}`}
              onClick={() => !done && setOpenType(t.type)}
              disabled={done}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${done ? "bg-green-500 text-white" : ""}`}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${done ? "text-green-700" : ""}`}>{t.label}</p>
                <p className="text-[10px] text-muted-foreground">{done ? "Screened ✓" : "Tap to screen"}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!openType} onOpenChange={(o) => { if (!o) { setOpenType(null); setAnswer(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tile && <tile.icon className="h-5 w-5" />}
              {tile?.label} Screening
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{tile?.question}</p>
          <div className="flex gap-3 mt-2">
            <Button
              variant={answer === "no" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setAnswer("no")}
            >
              No symptoms
            </Button>
            <Button
              variant={answer === "yes" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setAnswer("yes")}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Yes, I notice this
            </Button>
          </div>
          {answer === "yes" && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-1">
              Your doctor will be notified. Please schedule a follow-up for a detailed check.
            </p>
          )}
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!answer || screenMut.isPending}>
              {screenMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Submit & Earn MHP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
