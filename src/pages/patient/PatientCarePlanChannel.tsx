import { MARKETPLACE_PLANS } from "@/data/marketplace-plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  HeartPulse, 
  Sparkles, 
  ChevronRight, 
  Trophy, 
  Zap, 
  Users, 
  Star,
  ShieldCheck,
  TrendingUp,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

export default function PatientCarePlanChannel() {
  const categories = Array.from(new Set(MARKETPLACE_PLANS.map(p => p.category)));

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-4 py-1 text-xs font-bold uppercase tracking-widest">
            Level Up Your Health
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            The Mediimate <span className="text-emerald-400">Channel</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl font-medium leading-relaxed">
            Choose from expert-curated care plans. From chronic reversal to peak athletic performance. 
            Join thousands of patients already on their journey.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold">12k+ Active Users</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold">4.9/5 Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories & Plans */}
      {categories.map((category) => {
        const plans = MARKETPLACE_PLANS.filter(p => p.category === category);
        const coach = plans[0]?.coach;
        const coachRole = plans[0]?.coachRole;

        return (
          <section key={category} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{category}</h2>
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-3 h-3" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Headed by <span className="text-slate-900">{coach}</span> • {coachRole}
                  </p>
                </div>
              </div>
              <Button variant="ghost" className="text-emerald-600 font-bold hover:text-emerald-700 hover:bg-emerald-50 gap-2">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Link 
                  key={plan.id} 
                  to={`/patient/care-plan/channel/${plan.id}`}
                  className="group block"
                >
                  <Card className="h-full border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                    <div className="absolute top-4 right-4 z-20">
                      <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-slate-100 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-slate-700">PREMIUM</span>
                      </div>
                    </div>
                    
                    <div className="h-3 w-full" style={{ background: plan.cover_color }} />
                    <CardHeader className="space-y-1 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-black text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors">
                          {plan.name}
                        </CardTitle>
                      </div>
                      <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                        {plan.description}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {plan.features.slice(0, 2).map((f, i) => (
                          <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-600 text-[10px] font-bold border-none">
                            {f}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex flex-col gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-nowrap">Duration</p>
                          <p className="text-sm font-black text-slate-800">{plan.duration_days} Days</p>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex flex-col gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-nowrap">Rewards</p>
                          <p className="text-sm font-black text-slate-800">Earn MHP</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center ring-2 ring-white shadow-sm overflow-hidden">
                             {plan.coachImage ? (
                                <img src={plan.coachImage} alt={plan.coach} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300" />
                              )}
                           </div>
                           <p className="text-[11px] font-bold text-slate-700">{plan.coach}</p>
                         </div>
                         <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg px-4 h-8 text-xs">
                           Preview
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Why Mediimate Channel */}
      <section className="bg-emerald-50 rounded-3xl p-8 md:p-12 border border-emerald-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-1 ring-emerald-200">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Verified Protocols</h3>
            <p className="text-sm text-slate-600 font-medium">All plans are clinical-grade and reviewed by senior doctors.</p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-1 ring-emerald-200">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Dynamic Progress</h3>
            <p className="text-sm text-slate-600 font-medium">Auto-adjusting tasks based on your logs and physical performance.</p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-1 ring-emerald-200">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Earn Rewards</h3>
            <p className="text-sm text-slate-600 font-medium">The more consistent you are, the more Mediimate Health Points you earn.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
