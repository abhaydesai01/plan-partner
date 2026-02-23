import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Star,
  BedDouble,
  MapPin,
  Award,
  ChevronLeft,
  ArrowRight,
  User,
  Sparkles,
  Users,
  TrendingUp,
  CheckCircle2,
  Globe,
  Plane,
  Languages,
  Video,
  ShieldCheck,
  BookOpen,
  HeartPulse,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Doctor {
  id: string;
  name: string;
  specialties?: string[];
  experience_years?: number;
  avatar_url?: string;
  bio?: string;
  languages?: string[];
}

interface Review {
  id: string;
  patient_name: string;
  rating: number;
  review_text: string;
  is_verified?: boolean;
  created_at: string;
}

interface ProgramInfo {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration_days?: number;
}

interface HospitalDetail {
  id: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  description?: string;
  specialties?: string[];
  treatments_offered?: string[];
  accreditations?: string[];
  gallery_urls?: string[];
  bed_count?: number;
  price_range_min?: number;
  price_range_max?: number;
  rating_avg?: number;
  total_reviews?: number;
  established_year?: number;
  website?: string;
  phone?: string;
  email?: string;
  patient_volume?: number;
  completion_rate?: number;
  patient_satisfaction?: number;
  success_rates?: Record<string, number>;
  average_cost_by_treatment?: Record<string, number>;
  international_patient_count?: number;
  international_support?: {
    travel_assistance?: boolean;
    airport_pickup?: boolean;
    translator_available?: boolean;
    visa_assistance?: boolean;
    remote_followup?: boolean;
    supported_countries?: string[];
  };
  facilities?: string[];
  response_time_hours?: number;
  programs?: ProgramInfo[];
  doctors?: Doctor[];
  reviews?: Review[];
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, suffix }: { icon: React.ElementType; label: string; value: string | number; suffix?: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-muted/50">
      <Icon className="w-5 h-5 mx-auto text-primary mb-1" />
      <p className="text-lg font-bold text-foreground">{value}{suffix}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

const PatientHospitalProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const condition = searchParams.get("condition") || undefined;

  const { data: hospital, isLoading } = useQuery<HospitalDetail>({
    queryKey: ["hospital", id],
    queryFn: () => api.get<HospitalDetail>("hospitals/" + id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="glass-card rounded-xl p-6 sm:p-12 text-center text-muted-foreground">
        <p>Hospital not found.</p>
        <Link to="/patient/hospitals" className="text-primary text-sm mt-2 inline-block hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const doctors = hospital.doctors ?? [];
  const reviews = hospital.reviews ?? [];
  const intl = hospital.international_support;
  const hasIntlSupport = intl && (intl.travel_assistance || intl.airport_pickup || intl.translator_available || intl.visa_assistance || intl.remote_followup);
  const conditionSuccessRate = condition ? hospital.success_rates?.[condition] : undefined;
  const conditionCost = condition ? hospital.average_cost_by_treatment?.[condition] : undefined;

  const relevantDoctors = condition
    ? doctors.filter((d) => d.specialties?.some((s) => s.toLowerCase().includes(condition.toLowerCase())))
    : [];
  const otherDoctors = condition
    ? doctors.filter((d) => !relevantDoctors.includes(d))
    : doctors;

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 pb-24">
      {/* Back link */}
      <Link
        to="/patient/hospitals"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to search
      </Link>

      {/* Gallery */}
      {hospital.gallery_urls && hospital.gallery_urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl overflow-hidden">
          {hospital.gallery_urls.slice(0, 6).map((img, i) => (
            <div key={i} className={`overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
              <img src={img} alt={`${hospital.name} ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
            {hospital.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {(hospital.city || hospital.country) && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <MapPin className="w-4 h-4" />
                {[hospital.city, hospital.country].filter(Boolean).join(", ")}
              </span>
            )}
            {hospital.established_year && (
              <span className="text-xs text-muted-foreground">Est. {hospital.established_year}</span>
            )}
          </div>
        </div>

        {hospital.rating_avg != null && (
          <div className="flex items-center gap-2">
            <StarRating rating={hospital.rating_avg} size="md" />
            <span className="text-sm font-medium">{hospital.rating_avg.toFixed(1)}</span>
            {hospital.total_reviews != null && (
              <span className="text-sm text-muted-foreground">
                ({hospital.total_reviews} review{hospital.total_reviews !== 1 ? "s" : ""})
              </span>
            )}
          </div>
        )}

        {/* Match score for condition (when coming from intent) */}
        {condition && conditionSuccessRate && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {conditionSuccessRate}% success rate for {condition}
                </p>
                {conditionCost && (
                  <p className="text-xs text-muted-foreground">
                    Average cost: ₹{conditionCost.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Outcome Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {conditionSuccessRate ? (
          <MetricCard icon={TrendingUp} label={`Success (${condition})`} value={conditionSuccessRate} suffix="%" />
        ) : hospital.rating_avg ? (
          <MetricCard icon={Star} label="Avg Rating" value={hospital.rating_avg.toFixed(1)} suffix="/5" />
        ) : null}
        {hospital.patient_volume && (
          <MetricCard icon={Users} label="Patients Treated" value={hospital.patient_volume.toLocaleString()} />
        )}
        {hospital.completion_rate && (
          <MetricCard icon={CheckCircle2} label="Program Completion" value={hospital.completion_rate} suffix="%" />
        )}
        {hospital.patient_satisfaction && (
          <MetricCard icon={HeartPulse} label="Patient Satisfaction" value={hospital.patient_satisfaction} suffix="%" />
        )}
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hospital.description && (
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{hospital.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Specialties & Treatments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Specialties & Treatments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hospital.specialties && hospital.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hospital.specialties.map((s) => {
                  const isMatch = condition && s.toLowerCase().includes(condition.toLowerCase());
                  return (
                    <Badge key={s} variant={isMatch ? "default" : "secondary"} className={isMatch ? "bg-primary/20 text-primary" : ""}>
                      {s}
                    </Badge>
                  );
                })}
              </div>
            )}
            {hospital.treatments_offered && hospital.treatments_offered.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Treatments</p>
                <div className="flex flex-wrap gap-1.5">
                  {hospital.treatments_offered.map((t) => {
                    const isMatch = condition && t.toLowerCase().includes(condition.toLowerCase());
                    return (
                      <Badge key={t} variant="outline" className={isMatch ? "border-primary text-primary" : ""}>
                        {t}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facilities & Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Facilities & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hospital.bed_count != null && (
              <div className="flex items-center gap-2 text-sm">
                <BedDouble className="w-4 h-4 text-muted-foreground" />
                <span>{hospital.bed_count} beds</span>
              </div>
            )}
            {(hospital.price_range_min != null || hospital.price_range_max != null) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Price range: </span>
                ₹{hospital.price_range_min?.toLocaleString("en-IN") ?? "—"} – ₹{hospital.price_range_max?.toLocaleString("en-IN") ?? "—"}
              </div>
            )}
            {hospital.response_time_hours && (
              <div className="text-sm">
                <span className="text-muted-foreground">Avg response: </span>
                {hospital.response_time_hours}h
              </div>
            )}
            {hospital.accreditations && hospital.accreditations.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                  <Award className="w-3.5 h-3.5" /> Accreditations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hospital.accreditations.map((a) => (
                    <Badge key={a} variant="outline">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
            {hospital.facilities && hospital.facilities.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Facilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {hospital.facilities.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* International Support */}
      {hasIntlSupport && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> International Patient Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {intl!.travel_assistance && (
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4 text-primary" />
                  <span>Travel Assistance</span>
                </div>
              )}
              {intl!.airport_pickup && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Airport Pickup</span>
                </div>
              )}
              {intl!.translator_available && (
                <div className="flex items-center gap-2 text-sm">
                  <Languages className="w-4 h-4 text-primary" />
                  <span>Translator Available</span>
                </div>
              )}
              {intl!.visa_assistance && (
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Visa Assistance</span>
                </div>
              )}
              {intl!.remote_followup && (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Remote Follow-up</span>
                </div>
              )}
            </div>
            {intl!.supported_countries && intl!.supported_countries.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Experience with patients from</p>
                <div className="flex flex-wrap gap-1.5">
                  {intl!.supported_countries.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Programs */}
      {hospital.programs && hospital.programs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Programs Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hospital.programs.map((p) => (
                <div key={p.id} className="p-3 rounded-xl border border-border bg-muted/30">
                  <h4 className="text-sm font-medium text-foreground">{p.name}</h4>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {p.category && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
                    {p.duration_days && <Badge variant="outline" className="text-[10px]">{p.duration_days} days</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctors -- condition-relevant first */}
      {doctors.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold text-foreground">Doctors</h2>

          {relevantDoctors.length > 0 && condition && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Specialists for {condition}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {relevantDoctors.map((doc) => (
                  <DoctorCard key={doc.id} doctor={doc} highlight />
                ))}
              </div>
            </div>
          )}

          {otherDoctors.length > 0 && (
            <div className="space-y-2">
              {relevantDoctors.length > 0 && (
                <p className="text-xs text-muted-foreground font-medium">Other Doctors</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {otherDoctors.map((doc) => (
                  <DoctorCard key={doc.id} doctor={doc} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold text-foreground">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="glass-card rounded-xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="font-medium text-sm text-foreground">{review.patient_name}</span>
                    {review.is_verified && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.review_text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-3 safe-area-bottom">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <Button className="flex-1 gap-2" asChild>
            <Link to={`/patient/cases/new?hospital=${hospital.id}${condition ? `&condition=${encodeURIComponent(condition)}` : ""}`}>
              Request Treatment Plan <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          {hospital.phone && (
            <Button variant="outline" className="gap-2 shrink-0" asChild>
              <a href={`tel:${hospital.phone}`}>
                <Phone className="w-4 h-4" /> Call
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

function DoctorCard({ doctor, highlight }: { doctor: Doctor; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/20 bg-primary/5" : ""}>
      <CardContent className="p-4 flex items-start gap-3">
        {doctor.avatar_url ? (
          <img src={doctor.avatar_url} alt={doctor.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${highlight ? "bg-primary/20" : "bg-primary/10"}`}>
            <User className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">{doctor.name}</h3>
          {doctor.specialties && doctor.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {doctor.specialties.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {doctor.experience_years != null && (
              <p className="text-xs text-muted-foreground">{doctor.experience_years}y exp</p>
            )}
            {doctor.languages && doctor.languages.length > 0 && (
              <p className="text-xs text-muted-foreground">{doctor.languages.join(", ")}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PatientHospitalProfile;
