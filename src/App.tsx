import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PatientLayout, PatientLayoutWithChat } from "@/components/PatientLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PublicEnroll from "./pages/PublicEnroll";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import { ClinicLayout } from "./components/ClinicLayout";
import { FamilyLayout } from "./components/FamilyLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Programs = lazy(() => import("./pages/Programs"));
const Enrollments = lazy(() => import("./pages/Enrollments"));
const Appointments = lazy(() => import("./pages/Appointments"));
const DoctorVitals = lazy(() => import("./pages/DoctorVitals"));
const DoctorLabResults = lazy(() => import("./pages/DoctorLabResults"));
const DoctorDocuments = lazy(() => import("./pages/DoctorDocuments"));
const ComplianceReports = lazy(() => import("./pages/ComplianceReports"));
const DoctorLinkRequests = lazy(() => import("./pages/DoctorLinkRequests"));
const DoctorAvailability = lazy(() => import("./pages/DoctorAvailability"));
const Alerts = lazy(() => import("./pages/Alerts"));
const DoctorVaultAccess = lazy(() => import("./pages/DoctorVaultAccess"));
const DoctorFeedback = lazy(() => import("./pages/DoctorFeedback"));
const ClinicSetup = lazy(() => import("./pages/ClinicSetup"));
const ClinicSettings = lazy(() => import("./pages/ClinicSettings"));
const JoinClinic = lazy(() => import("./pages/JoinClinic"));
const PatientChat = lazy(() => import("./pages/patient/PatientChat"));
const PatientOverview = lazy(() => import("./pages/patient/PatientOverview"));
const PatientVitals = lazy(() => import("./pages/patient/PatientVitals"));
const PatientLabResults = lazy(() => import("./pages/patient/PatientLabResults"));
const PatientDocuments = lazy(() => import("./pages/patient/PatientDocuments"));
const PatientAppointments = lazy(() => import("./pages/patient/PatientAppointments"));
const PatientVault = lazy(() => import("./pages/patient/PatientVault"));
const PatientFoodAnalysis = lazy(() => import("./pages/patient/PatientFoodAnalysis"));
const PatientConnectDoctor = lazy(() => import("./pages/patient/PatientConnectDoctor"));
const PatientFeedback = lazy(() => import("./pages/patient/PatientFeedback"));
const ClinicDashboard = lazy(() => import("./pages/clinic/ClinicDashboard"));
const ClinicTeam = lazy(() => import("./pages/clinic/ClinicTeam"));
const ClinicPatients = lazy(() => import("./pages/clinic/ClinicPatients"));
const ClinicAppointments = lazy(() => import("./pages/clinic/ClinicAppointments"));
const ClinicSettingsPage = lazy(() => import("./pages/clinic/ClinicSettingsPage"));
const ClinicFeedback = lazy(() => import("./pages/clinic/ClinicFeedback"));
const FamilyDashboard = lazy(() => import("./pages/family/FamilyDashboard"));
const PatientAccountability = lazy(() => import("./pages/patient/PatientAccountability"));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/enroll/:doctorCode" element={<PublicEnroll />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Clinic Setup */}
            <Route path="/clinic-setup" element={<ProtectedRoute allowedRole="doctor"><ClinicSetup /></ProtectedRoute>} />
            <Route path="/join-clinic" element={<ProtectedRoute allowedRole="doctor"><JoinClinic /></ProtectedRoute>} />
            
            {/* Doctor Portal */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/patients" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Patients /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/patients/:id" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><PatientDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/programs" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Programs /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/enrollments" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Enrollments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/appointments" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Appointments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/availability" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorAvailability /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/vitals" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorVitals /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/lab-results" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorLabResults /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/documents" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorDocuments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/link-requests" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorLinkRequests /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/clinic" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><ClinicSettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/compliance" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><ComplianceReports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/alerts" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/vault-access" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorVaultAccess /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/feedback" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorFeedback /></DashboardLayout></ProtectedRoute>} />
            
            {/* Clinic Portal */}
            <Route path="/clinic" element={<ProtectedRoute allowedRole="clinic"><ClinicLayout><ClinicDashboard /></ClinicLayout></ProtectedRoute>} />
            <Route path="/clinic/team" element={<ProtectedRoute allowedRole="clinic"><ClinicLayout><ClinicTeam /></ClinicLayout></ProtectedRoute>} />
            <Route path="/clinic/patients" element={<ProtectedRoute allowedRole="clinic"><ClinicLayout><ClinicPatients /></ClinicLayout></ProtectedRoute>} />
            <Route path="/clinic/appointments" element={<ProtectedRoute allowedRole="clinic"><ClinicLayout><ClinicAppointments /></ClinicLayout></ProtectedRoute>} />
            <Route path="/clinic/feedback" element={<ProtectedRoute allowedRole="clinic"><ClinicLayout><ClinicFeedback /></ClinicLayout></ProtectedRoute>} />
            <Route path="/clinic/settings" element={<ProtectedRoute allowedRole="clinic"><ClinicLayout><ClinicSettingsPage /></ClinicLayout></ProtectedRoute>} />

            {/* Family Portal */}
            <Route path="/family" element={<ProtectedRoute allowedRole="family"><FamilyLayout><FamilyDashboard /></FamilyLayout></ProtectedRoute>} />
            
            {/* Patient Portal - Chat is the landing page */}
            <Route path="/patient" element={
              <ProtectedRoute allowedRole="patient">
                <PatientLayoutWithChat>
                  {(onOpenMenu) => <PatientChat onOpenMenu={onOpenMenu} />}
                </PatientLayoutWithChat>
              </ProtectedRoute>
            } />
            <Route path="/patient/overview" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientOverview /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/accountability" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientAccountability /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/connect-doctor" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientConnectDoctor /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/vitals" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientVitals /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/lab-results" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientLabResults /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/documents" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientDocuments /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/appointments" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientAppointments /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/feedback" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientFeedback /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/food-analysis" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientFoodAnalysis /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/vault" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientVault /></PatientLayout></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
