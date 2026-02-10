import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PatientLayout } from "@/components/PatientLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Programs from "./pages/Programs";
import Enrollments from "./pages/Enrollments";
import Appointments from "./pages/Appointments";
import DoctorVitals from "./pages/DoctorVitals";
import DoctorLabResults from "./pages/DoctorLabResults";
import DoctorDocuments from "./pages/DoctorDocuments";
import ComplianceReports from "./pages/ComplianceReports";
import DoctorLinkRequests from "./pages/DoctorLinkRequests";
import Alerts from "./pages/Alerts";
import ClinicSetup from "./pages/ClinicSetup";
import ClinicSettings from "./pages/ClinicSettings";
import JoinClinic from "./pages/JoinClinic";
import PatientOverview from "./pages/patient/PatientOverview";
import PatientVitals from "./pages/patient/PatientVitals";
import PatientLabResults from "./pages/patient/PatientLabResults";
import PatientDocuments from "./pages/patient/PatientDocuments";
import PatientAppointments from "./pages/patient/PatientAppointments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
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
            <Route path="/dashboard/vitals" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorVitals /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/lab-results" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorLabResults /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/documents" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorDocuments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/link-requests" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><DoctorLinkRequests /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/clinic" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><ClinicSettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/compliance" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><ComplianceReports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/alerts" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>} />
            
            {/* Patient Portal */}
            <Route path="/patient" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientOverview /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/vitals" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientVitals /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/lab-results" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientLabResults /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/documents" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientDocuments /></PatientLayout></ProtectedRoute>} />
            <Route path="/patient/appointments" element={<ProtectedRoute allowedRole="patient"><PatientLayout><PatientAppointments /></PatientLayout></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
