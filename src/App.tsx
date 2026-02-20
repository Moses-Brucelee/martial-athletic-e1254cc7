import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperUserGuard } from "@/components/super/SuperUserGuard";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainMenu from "./pages/MainMenu";
import CreateProfile from "./pages/CreateProfile";
import ViewProfile from "./pages/ViewProfile";
import CompetitionCreate from "./pages/CompetitionCreate";
import CompetitionWorkouts from "./pages/CompetitionWorkouts";
import CompetitionDashboard from "./pages/CompetitionDashboard";
import CompetitionList from "./pages/CompetitionList";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UpgradePackage from "./pages/UpgradePackage";
import SuperDashboard from "./pages/SuperDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/create-profile" element={<ProtectedRoute><CreateProfile /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><MainMenu /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ViewProfile /></ProtectedRoute>} />
              <Route path="/competitions" element={<ProtectedRoute><CompetitionList /></ProtectedRoute>} />
              <Route path="/competition/create" element={<ProtectedRoute><SubscriptionGuard requiredFeature="create_competitions"><CompetitionCreate /></SubscriptionGuard></ProtectedRoute>} />
              <Route path="/competition/:id/workouts" element={<ProtectedRoute><SubscriptionGuard requiredFeature="create_competitions"><CompetitionWorkouts /></SubscriptionGuard></ProtectedRoute>} />
              <Route path="/competition/:id" element={<ProtectedRoute><CompetitionDashboard /></ProtectedRoute>} />
              <Route path="/upgrade" element={<ProtectedRoute><UpgradePackage /></ProtectedRoute>} />
              <Route path="/super-dashboard" element={<ProtectedRoute><SuperUserGuard><SuperDashboard /></SuperUserGuard></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
