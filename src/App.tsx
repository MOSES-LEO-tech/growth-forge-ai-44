import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Schools from "./pages/Schools";
import SchoolProfile from "./pages/SchoolProfile";
import Gallery from "./pages/Gallery";
import EventGallery from "./pages/EventGallery";
import Projects from "./pages/Projects";
import HowItWorks from "./pages/HowItWorks";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import ResetPassword from "./pages/ResetPassword";
import AdminPanel from "./pages/AdminPanel";

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
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={(
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/admin"
                element={(
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                )}
              />
              <Route path="/features" element={<Features />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/schools" element={<Schools />} />
              <Route path="/schools/:id" element={<SchoolProfile />} />
              <Route
                path="/gallery"
                element={(
                  <ProtectedRoute>
                    <Gallery />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/gallery/user/:userId"
                element={(
                  <ProtectedRoute>
                    <Gallery />
                  </ProtectedRoute>
                )}
              />
              <Route path="/gallery/:id" element={<EventGallery />} />
              <Route
                path="/projects"
                element={(
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/projects/:userId"
                element={(
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                )}
              />
              <Route path="/contact" element={<Contact />} />
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
