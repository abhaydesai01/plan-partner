import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Droplets, Pill, Utensils, Footprints, Dumbbell, Send, Loader2, Check, Sparkles, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { Label } from "@/components/ui/label";

type TodayTasks = {
  fasting_sugar_logged: boolean;
  postmeal_sugar_logged: boolean;
  medicine_confirmed: boolean;
  meal_logged: boolean;
  foot_check_done: boolean;
  workout_logged: boolean;
};

type TaskItem = {
  key: keyof TodayTasks;
  action: string;
  label: string;
  icon: React.ElementType;
  done: boolean;
};

function fireConfetti() {
  confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 }, colors: ["#15803d", "#d97706", "#3b82f6"] });
}

export function TaskChecklist({ assignmentId, tasks, currentDay, medicationsStatus }: { assignmentId: string; tasks: TodayTasks; currentDay: number; medicationsStatus: { medicine: string; status: string }[] }) {
  const qc = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [sugarValue, setSugarValue] = useState("");
  const [foodText, setFoodText] = useState("");
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  
  // Natively mapped medication states from the WhatsApp bot structure
  const activeRemindersList = medicationsStatus || [];

  // Universal Gamification Action Log
  const logMut = useMutation({
    mutationFn: (body: any) => api.post(`me/careplan/${assignmentId}/log-action`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "careplan"] });
      qc.invalidateQueries({ queryKey: ["me", "gamification"] });
      qc.invalidateQueries({ queryKey: ["me", "vitals"] });
      fireConfetti();
      setActiveDialog(null);
      setSugarValue("");
      setFoodText("");
      setSelectedMeds([]);
    },
  });

  const taskList: TaskItem[] = [
    { key: "fasting_sugar_logged", action: "fasting_sugar_log", label: "Log Fasting Sugar", icon: Droplets, done: tasks.fasting_sugar_logged },
    { key: "postmeal_sugar_logged", action: "postmeal_sugar_log", label: "Log Post-Meal Sugar", icon: Droplets, done: tasks.postmeal_sugar_logged },
    { key: "medicine_confirmed", action: "medicine_confirm", label: "Confirm Medicine Taken", icon: Pill, done: tasks.medicine_confirmed },
    { key: "meal_logged", action: "meal_log", label: "Log a Meal", icon: Utensils, done: tasks.meal_logged },
    { key: "foot_check_done", action: "foot_check", label: "Foot Self-Check", icon: Footprints, done: tasks.foot_check_done },
    { key: "workout_logged", action: "workout_log", label: "Log Workout", icon: Dumbbell, done: tasks.workout_logged },
  ];

  const completedCount = taskList.filter((t) => t.done).length;
  const allDone = completedCount === taskList.length;

  const handleTaskClick = (task: TaskItem) => {
    if (task.done) return;
    // Intercept specific tasks with interactive modals
    if (task.action === "fasting_sugar_log" || task.action === "postmeal_sugar_log" || task.action === "meal_log" || task.action === "medicine_confirm") {
      setActiveDialog(task.action);
    } else {
      logMut.mutate({ action: task.action });
    }
  };

  const submitSugar = () => {
    if (!sugarValue) return;
    const isFasting = activeDialog === "fasting_sugar_log";
    logMut.mutate({
      action: isFasting ? "fasting_sugar_log" : "postmeal_sugar_log",
      value: Number(sugarValue)
    });
  };

  const submitFood = () => {
    if (!foodText) return;
    logMut.mutate({
      action: "meal_log",
      notes: foodText
    });
  };

  const submitMeds = () => {
    if (selectedMeds.length === 0) return;
    logMut.mutate({
      action: "medicine_confirm",
      medsList: selectedMeds
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Your Focus Today
        </p>
        <span className="text-xs font-semibold text-green-600">
          {completedCount}/{taskList.length}
        </span>
      </div>

      {allDone && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center transition-all animate-in zoom-in-95">
          <p className="text-sm font-semibold text-green-700 flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> All tasks done for today!
          </p>
        </div>
      )}

      <div className="space-y-2">
        {taskList.map((task) => {
          const Icon = task.icon;
          const isPending = logMut.isPending && logMut.variables?.action === task.action;
          return (
            <button
              key={task.key}
              onClick={() => handleTaskClick(task)}
              disabled={task.done || isPending}
              className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-all text-left group ${task.done ? "bg-green-50/50 border-green-200 cursor-default" : "bg-white border-slate-200 hover:border-green-300 hover:shadow-sm"}`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${task.done ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-green-100 group-hover:text-green-600"}`}>
                {task.done ? <Check className="h-4 w-4" /> : isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.done ? "text-green-700 line-through" : "text-slate-700 group-hover:text-slate-900"}`}>
                  {task.label}
                </p>
              </div>
              {!task.done && !isPending && (
                 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-green-500 transition-colors" />
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={activeDialog === "fasting_sugar_log" || activeDialog === "postmeal_sugar_log"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeDialog === "fasting_sugar_log" ? "Log Fasting Sugar" : "Log Post-Meal Sugar"}</DialogTitle>
            <DialogDescription>Enter your blood sugar reading directly into your centralized medical records.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-slate-700">Reading (mg/dL)</Label>
            <Input type="number" placeholder="e.g. 110" value={sugarValue} onChange={e => setSugarValue(e.target.value)} className="mt-2 text-lg h-12" />
          </div>
          <DialogFooter>
            <Button disabled={!sugarValue || logMut.isPending} onClick={submitSugar} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              {logMut.isPending ? "Protecting Data..." : "Save Medical Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "meal_log"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a Meal</DialogTitle>
            <DialogDescription>What did you eat? Our AI nutrition engine will automatically calculate calories and gamify your score just like WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea placeholder="E.g., 2 Rotis, Dal, and a small bowl of rice..." value={foodText} onChange={e => setFoodText(e.target.value)} rows={4} className="mt-2 resize-none text-base p-3" />
          </div>
          <DialogFooter>
            <Button disabled={!foodText || logMut.isPending} onClick={submitFood} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              {logMut.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing with AI...</> : "Log & Generate AI Insights"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "medicine_confirm"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Medicine Taken</DialogTitle>
            <DialogDescription>Select your active medications. This list is synced in real-time with your digital prescriptions.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {activeRemindersList.length > 0 ? activeRemindersList.map(item => {
              const med = item.medicine;
              const isTaken = item.status === "taken";
              const isSelected = selectedMeds.includes(med);
              
              return (
              <label key={med} className={`flex items-center space-x-3 rounded-xl border p-4 transition-all ${isTaken ? "opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed" : isSelected ? "border-green-500 bg-green-50 shadow-sm cursor-pointer" : "border-slate-200 hover:bg-slate-50 cursor-pointer"}`}>
                <Checkbox 
                  checked={isTaken || isSelected}
                  disabled={isTaken}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedMeds(prev => [...prev, med]);
                    else setSelectedMeds(prev => prev.filter(m => m !== med));
                  }}
                  className="w-5 h-5 rounded-md"
                />
                <span className={`text-base font-semibold ${isTaken ? "text-slate-500 line-through" : isSelected ? "text-green-900" : "text-slate-700"}`}>{med}</span>
                {isTaken && <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">Recorded</span>}
              </label>
            )}) : (
              <div className="text-center py-6 text-slate-500">
                <p className="text-sm font-medium">No active WhatsApp prescriptions found.</p>
                <p className="text-xs mt-1 text-slate-400">Your digital prescriptions haven't populated active reminders yet.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button disabled={selectedMeds.length === 0 || logMut.isPending} onClick={submitMeds} className="w-full sm:w-auto">
              {logMut.isPending ? "Logging..." : `Confirm ${selectedMeds.length} Medication${selectedMeds.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
