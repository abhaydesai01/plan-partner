import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Search,
  Star,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Users,
  TrendingUp,
  CheckCircle2,
  Globe,
  ArrowRight,
  Stethoscope,
  BookOpen,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Hospital {
  id: string;
  name: string;
  city?: string;
  country?: string;
  specialties?: string[];
  treatments_offered?: string[];
  rating_avg?: number;
  total_reviews?: number;
  price_range_min?: number;
  price_range_max?: number;
  bed_count?: number;
  logo_url?: string;
  patient_volume?: number;
  completion_rate?: number;
  patient_satisfaction?: number;
  success_rates?: Record<string, number>;
  international_patient_count?: number;
  international_support?: {
    travel_assistance?: boolean;
    remote_followup?: boolean;
  };
  program_ids?: string[];
  match_score?: number;
  match_breakdown?: {
    condition: number;
    doctors: number;
    outcomes: number;
    price: number;
    location: number;
    preference: number;
  };
}

interface HospitalListResponse {
  hospitals: Hospital[];
  total: number;
  page: number;
  total_pages: number;
}

interface Suggestion {
  type: string;
  text: string;
  id?: string;
  count?: number;
}

interface IntentData {
  condition: string;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  preferred_country?: string;
  timeline?: string;
  travel_type?: string;
}

const SORT_OPTIONS = [
  { value: "match", label: "Best Match" },
  { value: "outcomes", label: "Best Outcomes" },
  { value: "rating", label: "Highest Rated" },
  { value: "price", label: "Lowest Price" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function MatchScoreBadge({ score, condition }: { score: number; condition?: string }) {
  const color =
    score >= 80 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    : score >= 60 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";

  return (
    <Badge className={`${color} border-0 gap-1 text-xs font-semibold`}>
      <Sparkles className="w-3 h-3" />
      {score}% match{condition ? ` for ${condition}` : ""}
    </Badge>
  );
}

function HospitalCard({ hospital, condition, showMatchScore }: { hospital: Hospital; condition?: string; showMatchScore: boolean }) {
  const successRate = condition && hospital.success_rates?.[condition];

  return (
    <Card className="h-full hover:shadow-md transition-shadow group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {hospital.name}
            </h3>
            {hospital.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {hospital.city}{hospital.country ? `, ${hospital.country}` : ""}
              </p>
            )}
          </div>
          {showMatchScore && hospital.match_score != null && (
            <MatchScoreBadge score={hospital.match_score} />
          )}
        </div>

        {/* Specialty match */}
        {hospital.specialties && hospital.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hospital.specialties.slice(0, 3).map((s) => {
              const isMatch = condition && s.toLowerCase().includes(condition.toLowerCase());
              return (
                <Badge
                  key={s}
                  variant={isMatch ? "default" : "secondary"}
                  className={`text-[10px] ${isMatch ? "bg-primary/20 text-primary border-primary/30" : ""}`}
                >
                  {s}
                </Badge>
              );
            })}
            {hospital.specialties.length > 3 && (
              <Badge variant="outline" className="text-[10px]">+{hospital.specialties.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50">
          {successRate ? (
            <div className="text-center">
              <p className="text-xs font-bold text-emerald-600">{successRate}%</p>
              <p className="text-[10px] text-muted-foreground">Success</p>
            </div>
          ) : hospital.rating_avg ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <p className="text-xs font-bold">{hospital.rating_avg.toFixed(1)}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground">--</p>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs font-bold">{hospital.patient_volume?.toLocaleString() || "--"}</p>
            <p className="text-[10px] text-muted-foreground">Patients</p>
          </div>

          <div className="text-center">
            <p className="text-xs font-bold">{hospital.completion_rate ? `${hospital.completion_rate}%` : "--"}</p>
            <p className="text-[10px] text-muted-foreground">Completion</p>
          </div>
        </div>

        {/* International badge & Programs */}
        <div className="flex flex-wrap gap-1.5">
          {hospital.international_patient_count && hospital.international_patient_count > 0 && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <Globe className="w-2.5 h-2.5" /> International
            </Badge>
          )}
          {hospital.program_ids && hospital.program_ids.length > 0 && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <BookOpen className="w-2.5 h-2.5" /> {hospital.program_ids.length} Program{hospital.program_ids.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 text-xs h-8" asChild>
            <Link to={`/patient/cases/new?hospital=${hospital.id}${condition ? `&condition=${encodeURIComponent(condition)}` : ""}`}>
              Request Treatment
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" asChild>
            <Link to={`/patient/hospitals/${hospital.id}${condition ? `?condition=${encodeURIComponent(condition)}` : ""}`}>
              View Profile
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const PatientHospitalDiscovery = () => {
  const [searchParams] = useSearchParams();
  const isMatched = searchParams.get("matched") === "true";

  const [matchedHospitals, setMatchedHospitals] = useState<Hospital[]>([]);
  const [intent, setIntent] = useState<IntentData | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("match");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMatched) {
      try {
        const h = sessionStorage.getItem("matchedHospitals");
        const i = sessionStorage.getItem("matchIntent");
        if (h) setMatchedHospitals(JSON.parse(h));
        if (i) setIntent(JSON.parse(i));
      } catch { /* ignore */ }
    }
  }, [isMatched]);

  const hasIntent = isMatched && matchedHospitals.length > 0 && intent;

  const { data: browseData, isLoading: browseLoading } = useQuery<HospitalListResponse>({
    queryKey: ["hospitals-browse", search, cityFilter, conditionFilter, sortBy, page],
    queryFn: () =>
      api.get<HospitalListResponse>("hospitals", {
        search: search || undefined,
        city: cityFilter || undefined,
        condition: conditionFilter || undefined,
        sort: sortBy === "outcomes" ? "outcomes" : sortBy === "price" ? "price" : undefined,
        page,
      }),
    enabled: !hasIntent,
  });

  const handleSearchChange = async (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length >= 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const res = await api.get<{ suggestions: Suggestion[] }>("hospitals/search-suggest", { q: value });
          setSuggestions(res.suggestions);
          setShowSuggestions(true);
        } catch { /* ignore */ }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setShowSuggestions(false);
    if (s.type === "hospital" && s.id) {
      window.location.href = `/patient/hospitals/${s.id}`;
    } else if (s.type === "condition") {
      setConditionFilter(s.text);
      setSearch(s.text);
    } else if (s.type === "city") {
      setCityFilter(s.text);
      setSearch(s.text);
    }
  };

  const displayedHospitals = hasIntent ? matchedHospitals : (browseData?.hospitals ?? []);
  const totalPages = hasIntent ? 1 : (browseData?.total_pages ?? 1);
  const topMatches = hasIntent ? matchedHospitals.slice(0, 3) : [];
  const remainingMatches = hasIntent ? matchedHospitals.slice(3) : [];

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {/* Header */}
      {hasIntent ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
              Best Hospitals for Your {intent.condition}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {matchedHospitals.length} hospital{matchedHospitals.length !== 1 ? "s" : ""} ranked by match score
            {intent.preferred_location ? ` near ${intent.preferred_location}` : ""}
            {intent.budget_min || intent.budget_max ? ` within your budget` : ""}
          </p>
          <div className="flex gap-2 pt-1">
            <Link to="/patient/hospitals/find" className="text-xs text-primary hover:underline">
              Refine search
            </Link>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              onClick={() => {
                setMatchedHospitals([]);
                setIntent(null);
                sessionStorage.removeItem("matchedHospitals");
                sessionStorage.removeItem("matchIntent");
                window.history.replaceState(null, "", "/patient/hospitals");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Browse all hospitals
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
            Find Hospitals
          </h1>
          <p className="text-muted-foreground text-sm">
            Discover top-rated hospitals and clinics
          </p>
        </div>
      )}

      {/* Intent CTA (browse mode) */}
      {!hasIntent && (
        <Link to="/patient/hospitals/find" className="block">
          <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-foreground text-sm">
                  Tell us what you need
                </h3>
                <p className="text-xs text-muted-foreground">
                  Get personalized hospital recommendations based on your condition, budget, and preferences
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Search + Filters (browse mode) */}
      {!hasIntent && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search by hospital, condition, or city..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-9"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => handleSuggestionClick(s)}
                      className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      {s.type === "condition" && <Stethoscope className="w-4 h-4 text-primary shrink-0" />}
                      {s.type === "hospital" && <Building2 className="w-4 h-4 text-blue-500 shrink-0" />}
                      {s.type === "city" && <MapPin className="w-4 h-4 text-amber-500 shrink-0" />}
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground">{s.text}</span>
                        {s.count != null && (
                          <span className="text-xs text-muted-foreground ml-2">{s.count} hospital{s.count !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] capitalize shrink-0">
                        {s.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="glass-card rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                <Input
                  placeholder="Filter by city..."
                  value={cityFilter}
                  onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Condition</label>
                <Input
                  placeholder="Filter by condition..."
                  value={conditionFilter}
                  onChange={(e) => { setConditionFilter(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sort By</label>
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sort for intent mode */}
      {hasIntent && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sorted by best match for <span className="font-medium text-foreground">{intent.condition}</span>
          </p>
        </div>
      )}

      {/* Loading */}
      {!hasIntent && browseLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Recommended section (intent mode) */}
      {hasIntent && topMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Recommended for You
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topMatches.map((h) => (
              <HospitalCard key={h.id} hospital={h} condition={intent.condition} showMatchScore />
            ))}
          </div>
        </div>
      )}

      {/* All results */}
      {hasIntent && remainingMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-heading font-semibold text-muted-foreground">
            Other Hospitals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {remainingMatches.map((h) => (
              <HospitalCard key={h.id} hospital={h} condition={intent.condition} showMatchScore />
            ))}
          </div>
        </div>
      )}

      {/* Browse results */}
      {!hasIntent && !browseLoading && (
        <>
          {displayedHospitals.length === 0 ? (
            <div className="glass-card rounded-xl p-6 sm:p-12 text-center text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hospitals found matching your criteria.</p>
              <p className="text-sm mt-2">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedHospitals.map((h) => (
                  <HospitalCard key={h.id} hospital={h} condition={conditionFilter || undefined} showMatchScore={false} />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev != null && p - prev > 1;
                        return (
                          <span key={p} className="contents">
                            {showEllipsis && (
                              <PaginationItem>
                                <span className="px-2 text-muted-foreground">...</span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </span>
                        );
                      })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </>
      )}

      {/* Intent mode empty state */}
      {hasIntent && matchedHospitals.length === 0 && (
        <div className="glass-card rounded-xl p-6 sm:p-12 text-center text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hospitals matched your criteria.</p>
          <p className="text-sm mt-2">Try broadening your search preferences.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/patient/hospitals/find">Refine Search</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PatientHospitalDiscovery;
