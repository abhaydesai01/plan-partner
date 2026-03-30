import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Sparkles,
  Plus,
  Users,
  Activity,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";

interface CarePlan {
  id: string;
  name: string;
  slug: string;
  condition: string;
  duration_days: number;
  description: string;
  cover_color: string;
  is_active: boolean;
  enrolled_count: number;
  avg_adherence: number;
}

interface GeneratedPlan {
  name: string;
  slug: string;
  condition: string;
  duration_days: number;
  description: string;
  cover_color: string;
  scoring_rules: Record<string, number>;
  reward_tiers: { name: string; min_mhp: number; reward: string; color: string }[];
  week_themes: { week: number; title: string; focus: string; tasks: string[] }[];
}

const TRACKING_OPTIONS = [
  { id: "blood_sugar", label: "Blood Sugar (Fasting + Post-meal)" },
  { id: "blood_pressure", label: "Blood Pressure" },
  { id: "medications", label: "Medication Adherence" },
  { id: "meals", label: "Meal Logging" },
  { id: "weight", label: "Weight / BMI" },
  { id: "workouts", label: "Workouts & Physical Activity" },
  { id: "foot_checks", label: "Foot Checks" },
  { id: "symptoms", label: "Symptom Tracking" },
];

const DURATION_OPTIONS = [14, 30, 60, 90];

export default function DoctorCarePlans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"existing" | "build">("existing");

  // ── Existing plans state ──────────────────────────────────────────────
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // ── Builder state ─────────────────────────────────────────────────────
  const [condition, setCondition] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [goals, setGoals] = useState("");
  const [trackingItems, setTrackingItems] = useState<string[]>(["medications"]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [editableName, setEditableName] = useState("");
  const [editableDescription, setEditableDescription] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoadingPlans(true);
    try {
      const data = await api.get<CarePlan[]>("/care-plans");
      setPlans(data);
    } catch {
      toast({ title: "Failed to load care plans", variant: "destructive" });
    } finally {
      setLoadingPlans(false);
    }
  }

  function toggleTracking(id: string) {
    setTrackingItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (!condition.trim()) {
      toast({ title: "Please enter a condition name", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setGeneratedPlan(null);
    try {
      const data = await api.post<GeneratedPlan>("/care-plans/ai-generate", {
        condition: condition.trim(),
        duration_days: durationDays,
        goals: goals.trim(),
        tracking_items: trackingItems,
      });
      setGeneratedPlan(data);
      setEditableName(data.name);
      setEditableDescription(data.description);
    } catch {
      toast({ title: "Failed to generate plan", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedPlan) return;
    setSaving(true);
    try {
      await api.post("/care-plans/create", {
        ...generatedPlan,
        name: editableName,
        description: editableDescription,
      });
      toast({ title: "Care plan saved successfully!" });
      setGeneratedPlan(null);
      setCondition("");
      setGoals("");
      setTrackingItems(["medications"]);
      setActiveTab("existing");
      fetchPlans();
    } catch {
      toast({ title: "Failed to save care plan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const adherencePct = (n: number) => Math.round(n);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Care Plans</h1>
          <p className="text-sm text-gray-500">Design and manage structured chronic-disease programs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab("existing")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "existing"
              ? "bg-white text-emerald-700 shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Existing Care Plans
          </span>
        </button>
        <button
          onClick={() => setActiveTab("build")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "build"
              ? "bg-white text-emerald-700 shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Build a Care Plan
          </span>
        </button>
      </div>

      {/* ── Existing Care Plans ── */}
      {activeTab === "existing" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600 text-sm">{plans.length} program{plans.length !== 1 ? "s" : ""} available</p>
            <button
              onClick={() => setActiveTab("build")}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Care Plan
            </button>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No care plans yet</p>
              <p className="text-sm">Build your first program using the AI builder</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
                  onClick={() => navigate(`/dashboard/care-plans/${plan.id}`)}
                >
                  {/* Colour strip */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: plan.cover_color || "#16a34a" }}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                          {plan.name}
                        </h3>
                        <span className="inline-block mt-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          {plan.condition}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{plan.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Users className="w-4 h-4" />
                        {plan.enrolled_count ?? 0} enrolled
                      </span>
                      <span className="text-gray-500">{plan.duration_days} days</span>
                    </div>

                    {plan.enrolled_count > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Avg Adherence</span>
                          <span className="font-medium">{adherencePct(plan.avg_adherence ?? 0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${adherencePct(plan.avg_adherence ?? 0)}%`,
                              backgroundColor: plan.cover_color || "#16a34a",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Build a Care Plan ── */}
      {activeTab === "build" && (
        <div className="max-w-2xl">
          {!generatedPlan ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Care Plan Builder</h2>
                <p className="text-sm text-gray-500">
                  Enter the condition and preferences — the system will generate a structured
                  multi-week chronic care program for you to review and save.
                </p>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Condition / Disease <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, PCOS…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Program Duration</label>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDurationDays(d)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        durationDays === d
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "border-gray-200 text-gray-600 hover:border-emerald-300"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Program Goals <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={3}
                  placeholder="e.g. Reduce HbA1c below 7%, improve medication adherence to 90%, prevent complications…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Tracking items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What to Track</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRACKING_OPTIONS.map((opt) => {
                    const checked = trackingItems.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleTracking(opt.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                          checked
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                            checked ? "bg-emerald-600" : "border border-gray-300"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Plan…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate with AI</>
                )}
              </button>
            </div>
          ) : (
            /* ── Generated plan preview ── */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      AI Generated — review before saving
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900 mt-2">Plan Preview</h2>
                  </div>
                  <div
                    className="w-5 h-10 rounded-full"
                    style={{ backgroundColor: generatedPlan.cover_color }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plan Name</label>
                  <input
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea
                    value={editableDescription}
                    onChange={(e) => setEditableDescription(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Condition</p>
                    <p className="font-semibold text-gray-800">{generatedPlan.condition}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Duration</p>
                    <p className="font-semibold text-gray-800">{generatedPlan.duration_days} days</p>
                  </div>
                </div>

                {/* Week Themes */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Weekly Themes</p>
                  <div className="space-y-2">
                    {generatedPlan.week_themes?.slice(0, 4).map((wt) => (
                      <div key={wt.week} className="flex gap-3 text-sm bg-gray-50 rounded-xl p-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                          W{wt.week}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{wt.title}</p>
                          <p className="text-xs text-gray-500">{wt.focus}</p>
                        </div>
                      </div>
                    ))}
                    {(generatedPlan.week_themes?.length ?? 0) > 4 && (
                      <p className="text-xs text-gray-400 pl-2">
                        + {generatedPlan.week_themes.length - 4} more weeks
                      </p>
                    )}
                  </div>
                </div>

                {/* Reward Tiers */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Reward Tiers</p>
                  <div className="flex gap-2 flex-wrap">
                    {generatedPlan.reward_tiers?.map((tier) => (
                      <div
                        key={tier.name}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium"
                        style={{ borderColor: tier.color, color: tier.color }}
                      >
                        {tier.name} · {tier.min_mhp} MHP
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratedPlan(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors text-sm"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Check className="w-4 h-4" /> Save Care Plan</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
