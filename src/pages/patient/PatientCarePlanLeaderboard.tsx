import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import {
  LeaderboardCard,
  WeeklyPodium,
  ActivityFeed,
  MyPositionBanner,
  BatchMomentum,
} from "@/components/care-plans/LeaderboardComponents";

type LeaderboardData = {
  careplan_name: string;
  duration_days: number;
  current_day: number;
  total_members: number;
  logged_today: number;
  momentum_pct: number;
  rankings: any[];
  weekly_top: any[];
  activity_feed: any[];
  my_rank: number;
  my_mhp: number;
  next_above: { name: string; mhp: number; gap: number } | null;
};

export default function PatientCarePlanLeaderboard() {
  // First get the assignment to get the ID
  const { data: cpData } = useQuery<{ assignment: any }>({
    queryKey: ["me", "careplan"],
    queryFn: () => api.get("me/careplan"),
  });

  const assignmentId = cpData?.assignment?.id;

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["me", "careplan", "leaderboard", assignmentId],
    queryFn: () => api.get<LeaderboardData>(`me/careplan/${assignmentId}/leaderboard`),
    enabled: !!assignmentId,
  });

  if (isLoading || !cpData) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data || !assignmentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-6 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No leaderboard data available.</p>
        <Link to="/patient/care-plan">
          <Button variant="outline" size="sm">Back to Care Plan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/patient/care-plan">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-amber-500 drop-shadow-sm" />
            Leaderboard
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            {data.careplan_name} <span className="mx-1.5 opacity-50">•</span> Day {data.current_day}/{data.duration_days}
          </p>
        </div>
      </div>

      {/* Top Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MyPositionBanner
          myRank={data.my_rank}
          myMhp={data.my_mhp}
          totalMembers={data.total_members}
          nextAbove={data.next_above}
        />
        <BatchMomentum
          loggedToday={data.logged_today}
          totalMembers={data.total_members}
          momentumPct={data.momentum_pct}
        />
      </div>

      {/* Weekly Podium */}
      {data.weekly_top.length >= 3 && (
        <Card className="shadow-lg border-slate-200/60 overflow-hidden bg-slate-50/30">
          <CardHeader className="pb-0 pt-6">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              This Week's Top 3
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <WeeklyPodium top={data.weekly_top} />
          </CardContent>
        </Card>
      )}

      {/* Bottom Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Full Rankings */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-slate-200/60 transition-all">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                All Members ({data.total_members})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <LeaderboardCard rankings={data.rankings} />
            </CardContent>
          </Card>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-1">
          <Card className="shadow-md border-slate-200/60 bg-gradient-to-b from-slate-50 to-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Live Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ActivityFeed feed={data.activity_feed} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
