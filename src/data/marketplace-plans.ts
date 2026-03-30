import { 
  HeartPulse, 
  Wind, 
  Dumbbell, 
  Activity, 
  Utensils, 
  Flame, 
  Timer, 
  Zap,
  PersonStanding,
  Bike,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export type MarketplaceTask = {
  id: string;
  title: string;
  description: string;
  type: "vital" | "medicine" | "action" | "education";
  timeOfDay?: string;
  points: number;
};

export type MarketplaceDay = {
  day: number;
  theme: string;
  tasks: MarketplaceTask[];
};

export type MarketplacePlan = {
  id: string;
  category: string;
  name: string;
  description: string;
  coach: string;
  coachRole: string;
  coachImage?: string;
  heroImage?: string;
  duration_days: number;
  cover_color: string;
  price?: string;
  features: string[];
  days: MarketplaceDay[];
};

// Helper to generate dynamic tasks based on day number and pattern
const generateHairTasks = (day: number): MarketplaceDay => {
  // Manual overrides for preview days to ensure maximum variety
  if (day === 1) return {
    day, theme: "Scalp Assessment & Activation",
    tasks: [
      { id: "h1-1", title: "Micro-Dose Serum", description: "Apply to thinning areas only.", type: "medicine", points: 10 },
      { id: "h1-2", title: "Scalp Photo", description: "Take baseline photos for comparison.", type: "action", points: 20 },
    ]
  };
  if (day === 2) return {
    day, theme: "Follicle Nutrition",
    tasks: [
      { id: "h2-1", title: "Biotin Supplement", description: "Take with breakfast.", type: "medicine", points: 5 },
      { id: "h2-2", title: "Massage: Circulation", description: "4-min rapid finger taps.", type: "action", points: 10 },
    ]
  };
  if (day === 7) return {
    day, theme: "Deep Cleanse Protocol",
    tasks: [
      { id: "h7-1", title: "Clarifying Wash", description: "Remove sebum buildup.", type: "action", points: 15 },
      { id: "h7-2", title: "Log Protein Intake", description: "Target 60g+ today.", type: "vital", points: 5 },
    ]
  };
  if (day === 9) return {
    day, theme: "Density Recovery",
    tasks: [
      { id: "h9-1", title: "Night Serum", description: "Leave-in focus on crown.", type: "medicine", points: 10 },
      { id: "h9-2", title: "Stress Log", description: "Cortisol check (Sleep quality).", type: "vital", points: 5 },
    ]
  };
  if (day === 11) return {
    day, theme: "Hydration Focus",
    tasks: [
      { id: "h11-1", title: "Essential Oils", description: "Rosemary oil application.", type: "action", points: 15 },
      { id: "h11-2", title: "Water Intake", description: "Goal 2.5 Liters.", type: "vital", points: 5 },
    ]
  };

  const isWashDay = day % 3 === 0;
  const isEducationDay = day % 7 === 0;
  
  const tasks: MarketplaceTask[] = [
    { id: `h-serum-${day}`, title: "Serum Application", description: "Apply 2ml of regrowth serum to scalp.", type: "medicine", points: 5 },
    { id: `h-massage-${day}`, title: "Inversion Massage", description: "4 mins of gentle circular finger pressure.", type: "action", points: 10 },
  ];

  if (isWashDay) {
    tasks.push({ id: `h-wash-${day}`, title: "PH-Balanced Wash", description: "Use the prescribed clarifying shampoo.", type: "action", points: 15 });
  }

  return {
    day,
    theme: isWashDay ? "Conditioning & Scalp Cleanse" : "Daily Follicle Stimulation",
    tasks
  };
};

const generateWeightTasks = (day: number): MarketplaceDay => {
  if (day === 1) return {
    day, theme: "Baseline Metrics",
    tasks: [
      { id: "w1-1", title: "Weight & Waist", description: "Log morning baseline.", type: "vital", points: 20 },
      { id: "w1-2", title: "2k Brisk Walk", description: "Initial stamina check.", type: "action", points: 15 },
    ]
  };
  if (day === 2) return {
    day, theme: "Metabolic Kick",
    tasks: [
      { id: "w2-1", title: "High-Protein Breakfast", description: "Log your first meal.", type: "vital", points: 10 },
      { id: "w2-2", title: "15m HIIT", description: "Mountain climbers & burpees.", type: "action", points: 20 },
    ]
  };
  if (day === 7) return {
    day, theme: "Digestive Reset",
    tasks: [
      { id: "w7-1", title: "Probiotic Log", description: "Curd or Kombucha intake.", type: "medicine", points: 10 },
      { id: "w7-2", title: "Weekend Mobility", description: "Full body stretching.", type: "action", points: 10 },
    ]
  };
  if (day === 9) return {
    day, theme: "Fat Oxidation",
    tasks: [
      { id: "w9-1", title: "Black Coffee / Tea", description: "Log pre-workout caffeine.", type: "action", points: 5 },
      { id: "w9-2", title: "Resistance Band Work", description: "Upper body focus.", type: "action", points: 20 },
    ]
  };
  if (day === 11) return {
    day, theme: "Insulin Sensitivity",
    tasks: [
      { id: "w11-1", title: "IF Fasting Window", description: "Complete 16hr fast.", type: "action", points: 20 },
      { id: "w11-2", title: "Sleep hygiene", description: "No screen 1hr before bed.", type: "vital", points: 5 },
    ]
  };

  const cycleDay = (day - 1) % 7; // 0-6
  let theme = "";
  const tasks: MarketplaceTask[] = [
    { id: `w-weight-${day}`, title: "Daily Weigh-in", description: "Check weight first thing in morning.", type: "vital", points: 10 },
    { id: `w-water-${day}`, title: "3L Hydration Goal", description: "Log your daily water intake.", type: "vital", points: 5 },
  ];

  if (cycleDay === 0 || cycleDay === 2 || cycleDay === 4) {
    theme = "Metabolic Push Day (HIIT)";
    tasks.push({ id: `w-hiit-${day}`, title: "20m Tabata Burn", description: "High intensity intervals.", type: "action", points: 25 });
  } else {
    theme = "Steady State & Gut Focus";
    tasks.push({ id: `w-walk-${day}`, title: "30m Brisk Walk", description: "Maintain Zone 2 heart rate.", type: "action", points: 15 });
  }

  return { day, theme, tasks };
};

const generateDiabetesTasks = (day: number): MarketplaceDay => {
  if (day === 1) return {
    day, theme: "Welcome & Onboarding",
    tasks: [
      { id: "d1-1", title: "Initial Fasting Sugar", description: "Morning baseline reading.", type: "vital", points: 10 },
      { id: "d1-2", title: "Caregiver Invite", description: "Add a family member for support.", type: "action", points: 15 },
    ]
  };
  if (day === 2) return {
    day, theme: "Medication Adherence",
    tasks: [
      { id: "d2-1", title: "Pharma Inventory", description: "Check if you have 30d stock.", type: "action", points: 10 },
      { id: "d2-2", title: "Log Lunch Carb", description: "Photo of your main meal.", type: "vital", points: 5 },
    ]
  };
  if (day === 7) return {
    day, theme: "First Week Recap",
    tasks: [
      { id: "d7-1", title: "Weekly Foot Check", description: "Check for sores/redness.", type: "action", points: 20 },
      { id: "d7-2", title: "Streak Bonus Claim", description: "Redeem 7-day badge.", type: "action", points: 50 },
    ]
  };
  if (day === 9) return {
    day, theme: "HbA1c Insight",
    tasks: [
      { id: "d9-1", title: "Post-Meal Sugar", description: "2 hrs after dinner.", type: "vital", points: 10 },
      { id: "d9-2", title: "Sugar-Free Swap", description: "Replace 1 snack today.", type: "action", points: 10 },
    ]
  };
  if (day === 11) return {
    day, theme: "Complication Prevention",
    tasks: [
      { id: "d11-1", title: "Hydration Check", description: "Flush kidneys with 3L water.", type: "vital", points: 5 },
      { id: "d11-2", title: "Lower Body Flow", description: "10m circulation exercise.", type: "action", points: 15 },
    ]
  };

  const tasks: MarketplaceTask[] = [
    { id: `d-fast-${day}`, title: "Fasting Sugar", description: "Measure before first meal.", type: "vital", points: 10 },
    { id: `d-meds-${day}`, title: "Diabetes Meds", description: "Confirm dosage compliance.", type: "medicine", points: 5 },
  ];

  return { day, theme: "Active Management Phase", tasks };
};

const generateFitnessTasks = (day: number, mode: 'run' | 'cycle' | 'tuneup'): MarketplaceDay => {
  // Variations for fitness based on day number
  const cycleDay = (day - 1) % 7;
  const tasks: MarketplaceTask[] = [];
  let theme = "";

  if (day === 1) return { day, theme: mode === 'run' ? "Cooper Test" : "Base Stamina", tasks: [{id: 'f1-1', title: "12m Max Distance", description: "Baseline fitness test.", type: "action", points: 30}] };
  if (day === 2) return { day, theme: "Recovery & Nutrition", tasks: [{id: 'f2-1', title: "Protein Loading", description: "Goal: 100g protein.", type: "vital", points: 10}] };
  if (day === 7) return { day, theme: "LSD (Long Slow Distance)", tasks: [{id: 'f7-1', title: "90m Zone 2 Effort", description: "Build cardio engine.", type: "action", points: 40}] };
  if (day === 9) return { day, theme: "Interval Sprints", tasks: [{id: 'f9-1', title: "8x200m Sprints", description: "Explosive power work.", type: "action", points: 30}] };
  if (day === 11) return { day, theme: "Climb / Resistance", tasks: [{id: 'f11-1', title: "Inclined Progression", description: "Leg strength focus.", type: "action", points: 35}] };

  return { day, theme: "Continuous Training", tasks: [{id: `f-${day}`, title: "Core Session", description: "20m abdominal circuit.", type: "action", points: 15}] };
};

export const MARKETPLACE_PLANS: MarketplacePlan[] = [
  {
    id: "hair-rejuvenation-prog",
    category: "Hair Care",
    name: "Hair Rejuvenation Protocol",
    description: "Clinical-grade protocol to reduce hair fall and improve scalp health.",
    coach: "Dr. Abrar Mohammed",
    coachRole: "Chief Dermatologist",
    coachImage: "/coaches/dr-abrar.png",
    heroImage: "/plans/hair-hero.png",
    duration_days: 30,
    cover_color: "#be185d", 
    features: ["Daily scalp massage", "Serum tracking", "Nutrition for hair"],
    days: Array.from({ length: 30 }, (_, i) => generateHairTasks(i + 1))
  },
  {
    id: "weight-loss-kickstart",
    category: "Weight Management",
    name: "Weight Loss Kickstart",
    description: "A metabolic reset focusing on gut health and sustainable fat loss.",
    coach: "Coach Rahul",
    coachRole: "Metabolic Specialist",
    coachImage: "/coaches/coach-rahul.png",
    duration_days: 21,
    cover_color: "#059669", 
    features: ["Intermittent fasting", "High-protein meal plan"],
    days: Array.from({ length: 21 }, (_, i) => generateWeightTasks(i + 1))
  },
  {
    id: "diabetes-prevention-cure",
    category: "Diabetes Cure",
    name: "Diabetes Prevention & Cure",
    description: "Reverse insulin resistance through lifestyle and precise monitoring.",
    coach: "Dr. Suman",
    coachRole: "Chief Diabetologist",
    coachImage: "/coaches/dr-suman.png",
    duration_days: 30,
    cover_color: "#1e40af", 
    features: ["Sugar logging", "Meds tracking", "HbA1c focus"],
    days: Array.from({ length: 30 }, (_, i) => generateDiabetesTasks(i + 1))
  },
  {
    id: "fitness-tune-up",
    category: "Fitness Hub",
    name: "Fitness Tune Up",
    description: "Get back into shape with a balanced 15-day home workout plan.",
    coach: "Coach Deepa",
    coachRole: "Fitness & Wellness Coach",
    coachImage: "/coaches/coach-deepa.png",
    duration_days: 15,
    cover_color: "#7c3aed", 
    features: ["Home workouts", "Flexibility training"],
    days: Array.from({ length: 15 }, (_, i) => generateFitnessTasks(i + 1, 'tuneup'))
  },
  {
    id: "half-marathon-prep",
    category: "Fitness Hub",
    name: "Half Marathon Plan",
    description: "Structured running plan for your first 21.1km.",
    coach: "Coach Deepa",
    coachRole: "Elite Runner",
    coachImage: "/coaches/coach-deepa.png",
    duration_days: 30,
    cover_color: "#ea580c", 
    features: ["Pacing strategies", "Endurance building"],
    days: Array.from({ length: 30 }, (_, i) => generateFitnessTasks(i + 1, 'run'))
  },
  {
    id: "marathon-mastery",
    category: "Fitness Hub",
    name: "Marathon Mastery",
    description: "The ultimate 42.2km training protocol for experienced runners.",
    coach: "Coach Deepa",
    coachRole: "Elite Runner",
    coachImage: "/coaches/coach-deepa.png",
    duration_days: 30,
    cover_color: "#991b1b", 
    features: ["Long run protocols", "Nutritional loading"],
    days: Array.from({ length: 30 }, (_, i) => generateFitnessTasks(i + 1, 'run'))
  },
  {
    id: "first-100k-cycling",
    category: "Fitness Hub",
    name: "First 100k Cycling Plan",
    description: "Build the stamina to conquer a continuous 100km ride.",
    coach: "Coach Vikram",
    coachRole: "National Cycling Coach",
    coachImage: "/coaches/coach-vikram.png",
    duration_days: 30,
    cover_color: "#4f46e5", 
    features: ["Cadence training", "Bike prep"],
    days: Array.from({ length: 30 }, (_, i) => generateFitnessTasks(i + 1, 'cycle'))
  }
];
