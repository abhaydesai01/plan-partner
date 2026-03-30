import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  Activity,
  Flame,
  UserPlus,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  CalendarDays,
  Pill,
  Footprints,
  ShieldCheck,
  X,
} from "lucide-react";

interface PatientRow {
  assignment_id: string;
  patient_id: string;
  full_name: string;
  phone: string;
  age: number | null;
  gender: string;
  conditions: string[];
  status: string;
  current_day: number;
  duration_days: number;
  adherence_pct: number;
  med_adherence_pct: number;
  mhp_balance: number;
  mhp_tier: string;
  streak_days: number;
  last_log_date: string | null;
  avg_fasting_sugar: number | null;
  complications_screened: { eye: boolean; kidney: boolean; nerve: boolean; heart: boolean };
  appointment_booked: boolean;
}

interface PlanSummary {
  plan: {
    _id: string;
    name: string;
    condition: string;
    duration_days: number;
    description: string;
    cover_color: string;
  };
  total_enrolled: number;
  avg_adherence: number;
  avg_mhp: number;
  logged_today: number;
  tier_counts: Record<string, number>;
  patients: PatientRow[];
}

const TIER_COLORS: Record<string, string> = {
  Gold: "#d97706",
  Silver: "#6b7280",
  Bronze: "#92400e",
  None: "#9ca3af",
};

function TierBadge({ tier }: { tier: string }) {
  const col = TIER_COLORS[tier] ?? "#9ca3af";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ borderColor: col, color: col }}
    >
      <Award className="w-3 h-3" />
      {tier}
    </span>
  );
}

function CompCheck({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  ) : (
    <XCircle className="w-4 h-4 text-gray-200" />
  );
}

export default function DoctorCarePlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [summary, setSummary] = useState<PlanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Add patient modal
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  // Search / filter
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSummary();
  }, [id]);

  async function fetchSummary() {
    setLoading(true);
    try {
      const data = await api.get<PlanSummary>(`/care-plans/${id}/summary`);
      setSummary(data);
    } catch {
      toast({ title: "Failed to load care plan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPatient() {
    if (!phone.trim()) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await api.post<{ message: string }>(`/care-plans/${id}/add-patient`, { phone: phone.trim() });
      toast({ title: res.message || "Patient added to this care plan!" });
      setShowModal(false);
      setPhone("");
      fetchSummary();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to add patient";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  const filtered = (summary?.patients ?? []).filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const pct = (n: number) => `${Math.round(n)}%`;
  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    const dt = new Date(d);
    const today = new Date();
    const diff = Math.round((today.getTime() - dt.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!summary) return null;
  const { plan } = summary;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/dashboard/care-plans")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Care Plans
      </button>

      {/* Plan header */}
      <div
        className="rounded-2xl p-6 text-white mb-6"
        style={{ background: `linear-gradient(135deg, ${plan.cover_color ?? "#16a34a"} 0%, ${plan.cover_color ?? "#16a34a"}cc 100%)` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {plan.condition}
            </span>
            <h1 className="text-2xl font-bold mt-2 mb-1">{plan.name}</h1>
            <p className="text-sm text-white/80 max-w-lg">{plan.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-white/80">
              <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {plan.duration_days} days</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {summary.total_enrolled} enrolled</span>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl font-medium text-sm hover:bg-emerald-50 transition-colors flex-shrink-0 self-start"
          >
            <UserPlus className="w-4 h-4" /> Add Patient
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-600" />}
          label="Avg Adherence"
          value={pct(summary.avg_adherence)}
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-amber-500" />}
          label="Avg MHP Balance"
          value={Math.round(summary.avg_mhp).toLocaleString()}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="Logged Today"
          value={`${summary.logged_today} / ${summary.total_enrolled}`}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-purple-500" />}
          label="Tier Distribution"
          value={
            <>
              {Object.entries(summary.tier_counts).map(([tier, cnt]) => (
                <span
                  key={tier}
                  className="mr-1 text-xs"
                  style={{ color: TIER_COLORS[tier] ?? "#9ca3af" }}
                >
                  {tier[0]}:{cnt}
                </span>
              ))}
            </>
          }
          bg="bg-purple-50"
        />
      </div>

      {/* Patient table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Enrolled Patients</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 w-56"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No patients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Day</th>
                  <th className="px-4 py-3 text-left">Adherence</th>
                  <th className="px-4 py-3 text-left">MHP</th>
                  <th className="px-4 py-3 text-left">Tier</th>
                  <th className="px-4 py-3 text-left">Streak</th>
                  <th className="px-4 py-3 text-left">Last Log</th>
                  <th className="px-4 py-3 text-left">
                    <span title="Avg fasting blood sugar">Avg BG</span>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span title="Complication screenings: Eye / Kidney / Nerve / Heart">
                      Complications
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center">Appt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.assignment_id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Patient name + phone */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.full_name}</div>
                      <div className="text-xs text-gray-400">{p.phone}</div>
                      {p.conditions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.conditions.slice(0, 2).map((c) => (
                            <span key={c} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Day progress */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {p.current_day}/{p.duration_days}
                      </div>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.min(100, (p.current_day / p.duration_days) * 100)}%` }}
                        />
                      </div>
                    </td>

                    {/* Adherence */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-gray-700">
                          <Activity className="w-3 h-3 text-emerald-500" />
                          {pct(p.adherence_pct)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Pill className="w-3 h-3 text-blue-400" />
                          Med: {pct(p.med_adherence_pct)}
                        </span>
                      </div>
                    </td>

                    {/* MHP */}
                    <td className="px-4 py-3 font-semibold text-amber-600">
                      {p.mhp_balance.toLocaleString()}
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <TierBadge tier={p.mhp_tier} />
                    </td>

                    {/* Streak */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-orange-500 font-medium">
                        <Flame className="w-3.5 h-3.5" />
                        {p.streak_days}d
                      </span>
                    </td>

                    {/* Last log */}
                    <td className="px-4 py-3 text-gray-500">{fmtDate(p.last_log_date)}</td>

                    {/* Avg blood glucose */}
                    <td className="px-4 py-3">
                      {p.avg_fasting_sugar !== null ? (
                        <span
                          className={`font-medium ${
                            p.avg_fasting_sugar > 180
                              ? "text-red-600"
                              : p.avg_fasting_sugar > 130
                              ? "text-amber-500"
                              : "text-emerald-600"
                          }`}
                        >
                          {Math.round(p.avg_fasting_sugar)} mg/dL
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Complications (eye, kidney, nerve, heart) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1" title="Eye · Kidney · Nerve · Heart">
                        <span title="Eye"><CompCheck done={p.complications_screened?.eye} /></span>
                        <span title="Kidney"><CompCheck done={p.complications_screened?.kidney} /></span>
                        <span title="Nerve"><CompCheck done={p.complications_screened?.nerve} /></span>
                        <span title="Heart"><CompCheck done={p.complications_screened?.heart} /></span>
                      </div>
                      <div className="flex items-center justify-center gap-0.5 text-[10px] text-gray-300 mt-0.5">
                        <span>E</span><span>K</span><span>N</span><span>H</span>
                      </div>
                    </td>

                    {/* Appointment */}
                    <td className="px-4 py-3 text-center">
                      {p.appointment_booked ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Patient Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Patient to Plan</h3>
              <button
                onClick={() => { setShowModal(false); setPhone(""); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Enter the patient's registered phone number. They must already have a patient account
              in MediMate.
            </p>
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPatient(); }}
                placeholder="e.g. +919876543210 or 9876543210"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setPhone(""); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPatient}
                disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {adding ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Add Patient</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
