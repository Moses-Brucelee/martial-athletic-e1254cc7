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
import { FeatureRouteGuard } from "@/components/FeatureRouteGuard";
import { RequireTier } from "@/components/RequireTier";
import { ProfileFieldsPromptProvider } from "@/hooks/useRequireProfileFields";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainMenu from "./pages/MainMenu";
import CreateProfile from "./pages/CreateProfile";
import ViewProfile from "./pages/ViewProfile";
import CompetitionCreate from "./pages/CompetitionCreate";
// CompetitionWorkouts merged into CompetitionCreate wizard
import CompetitionDashboard from "./pages/CompetitionDashboard";
import CompetitionList from "./pages/CompetitionList";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import SuperDashboard from "./pages/SuperDashboard";
import MembersPage from "./modules/members/components/MembersPage";
import NotFound from "./pages/NotFound";
import Guide from "./pages/Guide";
import Affiliation from "./pages/Affiliation";
import GymWebsite from "./pages/GymWebsite";
import Performances from "./pages/Performances";
import Browse from "./pages/Browse";
import CompetitionPublic from "./pages/CompetitionPublic";
import CompetitionDetail from "./pages/CompetitionDetail";
import SponsorRedirect from "./pages/SponsorRedirect";
import Unsubscribe from "./pages/Unsubscribe";
import InviteResponse from "./pages/InviteResponse";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ProfileFieldsPromptProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/tutorial" element={<Guide />} />
              <Route path="/create-profile" element={<ProtectedRoute><CreateProfile /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><MainMenu /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ViewProfile /></ProtectedRoute>} />
              <Route path="/competitions" element={<ProtectedRoute><CompetitionList /></ProtectedRoute>} />
              <Route path="/competition/create" element={<ProtectedRoute><RequireTier tier="affiliate_pro"><CompetitionCreate /></RequireTier></ProtectedRoute>} />
              {/* /competition/:id/workouts removed — now part of creation wizard */}
              <Route path="/competition/:id" element={<ProtectedRoute><CompetitionDashboard /></ProtectedRoute>} />
              
              <Route path="/super-dashboard" element={<ProtectedRoute><SuperUserGuard><SuperDashboard /></SuperUserGuard></ProtectedRoute>} />
              <Route path="/members" element={<ProtectedRoute><RequireTier tier="affiliate_pro"><MembersPage /></RequireTier></ProtectedRoute>} />
              <Route path="/affiliation" element={<ProtectedRoute><RequireTier tier="affiliate_pro"><Affiliation /></RequireTier></ProtectedRoute>} />
              <Route path="/gym-website" element={<ProtectedRoute><RequireTier tier="affiliate_pro"><GymWebsite /></RequireTier></ProtectedRoute>} />
              <Route path="/performances" element={<ProtectedRoute><RequireTier tier="tournament_pro"><Performances /></RequireTier></ProtectedRoute>} />
              <Route path="/browse" element={<FeatureRouteGuard flag="browse_marketplace" redirectTo="/"><Browse /></FeatureRouteGuard>} />
              <Route path="/event/:id" element={<CompetitionPublic />} />
              <Route path="/sponsor-redirect" element={<SponsorRedirect />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/invite/:id" element={<InviteResponse />} />
              <Route path="/event/:id/results" element={<ProtectedRoute><CompetitionDetail /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ProfileFieldsPromptProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
