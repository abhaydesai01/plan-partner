import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Activity, Thermometer, Weight, Heart } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Vital = {
  id: string;
  vital_type: "blood_pressure" | "heart_rate" | "temperature" | "weight" | "blood_sugar" | "spo2";
  value_text: string;
  value_numeric: number | null;
  unit: string | null;
  recorded_at: string;
};

const VITAL_INFO = {
  blood_pressure: { 
    label: "Blood Pressure", 
    icon: Activity, 
    color: "text-rose-500", 
    borderActive: "border-rose-300 ring-rose-200",
    stroke: "#f43f5e" 
  },
  blood_sugar: { 
    label: "Blood Sugar", 
    icon: Activity, 
    color: "text-blue-500", 
    borderActive: "border-blue-300 ring-blue-200",
    stroke: "#3b82f6" 
  },
  heart_rate: { 
    label: "Heart Rate", 
    icon: Heart, 
    color: "text-rose-400", 
    borderActive: "border-rose-300 ring-rose-200",
    stroke: "#fb7185" 
  },
  weight: { 
    label: "Weight", 
    icon: Weight, 
    color: "text-emerald-500", 
    borderActive: "border-emerald-300 ring-emerald-200",
    stroke: "#10b981" 
  },
  temperature: { 
    label: "Temperature", 
    icon: Thermometer, 
    color: "text-amber-500", 
    borderActive: "border-amber-300 ring-amber-200",
    stroke: "#f59e0b" 
  },
  spo2: { 
    label: "SpO2", 
    icon: Activity, 
    color: "text-indigo-500", 
    borderActive: "border-indigo-300 ring-indigo-200",
    stroke: "#6366f1" 
  },
};

export function DashboardVitalsHub() {
  const { data: vitals, isLoading, isError } = useQuery({
    queryKey: ["me", "vitals"],
    queryFn: async () => {
      const data = await api.get<Vital[]>("me/vitals");
      return Array.isArray(data) ? data : [];
    },
  });

  const [activeTab, setActiveTab] = useState<keyof typeof VITAL_INFO | null>(null);

  const { latestVitals, chartData, availableTypes } = useMemo(() => {
    if (!vitals || vitals.length === 0) return { latestVitals: {}, chartData: [], availableTypes: [] };

    const latest: Record<string, Vital> = {};
    const sorted = [...vitals].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    
    sorted.forEach(v => {
      if (!latest[v.vital_type]) latest[v.vital_type] = v;
    });

    const types = Object.keys(latest) as Array<keyof typeof VITAL_INFO>;
    const active = activeTab && types.includes(activeTab) ? activeTab : types[0];

    const filteredForChart = sorted.filter(v => v.vital_type === active).reverse();
    
    // Process values for the chart (for BP which is a string "120/80", value_numeric falls back to parsing)
    // We already have numeric values mapped, but if missing, just try parseFloat
    const chart = filteredForChart.map(v => {
      const val = v.value_numeric ?? parseFloat(v.value_text);
      return {
        date: format(new Date(v.recorded_at), "MMM d, h:mm a"),
        shortDate: format(new Date(v.recorded_at), "MMM d"),
        value: Number.isFinite(val) ? val : 0,
        raw: v.value_text
      };
    });

    return { latestVitals: latest, chartData: chart, availableTypes: types };
  }, [vitals, activeTab]);

  // Set initial active tab when data loads
  useEffect(() => {
    if (!activeTab && availableTypes.length > 0) {
      setActiveTab(availableTypes[0]);
    }
  }, [availableTypes, activeTab]);

  if (isLoading) {
    return <Skeleton className="h-[250px] w-full rounded-2xl shadow-sm border-slate-200/60" />;
  }

  if (isError || !vitals || vitals.length === 0) {
    return (
      <Card className="shadow-md border-slate-200/60 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Vitals Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-slate-500 text-sm">
          No vitals recorded yet. Use WhatsApp or the Vitals page to log your first reading.
        </CardContent>
      </Card>
    );
  }

  const currentTabInfo = activeTab ? VITAL_INFO[activeTab] : VITAL_INFO.blood_sugar;

  return (
    <Card className="shadow-md border-slate-200/60 overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-0 pt-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Comprehensive Vitals
          </CardTitle>
        </div>
        
        {/* Horizontal scrollable vital cards */}
        <div className="flex overflow-x-auto gap-3 pb-4 px-2 -mx-2 sm:mx-0 snap-x">
          {availableTypes.map(type => {
            const info = VITAL_INFO[type];
            if (!info) return null;
            const isSelected = activeTab === type;
            const Icon = info.icon;
            const vital = latestVitals[type];
            
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`snap-start flex flex-col items-start p-3 min-w-[140px] rounded-2xl border text-left transition-all duration-200 ${
                  isSelected 
                    ? `bg-white border-transparent shadow-sm ring-2 ${info.borderActive}` 
                    : `bg-white border-slate-200 hover:bg-slate-50 opacity-70 hover:opacity-100`
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                  {info.label}
                </div>
                <div className="text-lg font-black text-slate-800 tabular-nums tracking-tight">
                  {vital.value_text} <span className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">{vital.unit}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 pb-6 pr-6">
        {chartData.length > 1 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentTabInfo?.stroke || "#3b82f6"} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={currentTabInfo?.stroke || "#3b82f6"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin - (dataMin * 0.05)', 'dataMax + (dataMax * 0.05)']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '12px' }} 
                  itemStyle={{ color: currentTabInfo?.stroke || "#3b82f6", fontWeight: 'bold' }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}
                  formatter={(value: number, name: string, props: any) => [`${props.payload.raw} ${latestVitals[activeTab!]?.unit || ''}`, currentTabInfo?.label]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={currentTabInfo?.stroke || "#3b82f6"} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorGradient)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: currentTabInfo?.stroke }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium italic text-center px-4">
              Log another {currentTabInfo?.label.toLowerCase()} reading to reveal your progress trend!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
