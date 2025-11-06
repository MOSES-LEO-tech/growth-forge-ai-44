import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
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
import About from "./pages/About";
import Careers from "./pages/Careers";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();

const MyGalleryRedirect = () => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setTarget(`/gallery/user/${session.user.id}`);
      } else {
        setTarget(`/auth`);
      }
    };
    run();
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
};

const MyProjectsRedirect = () => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setTarget(`/projects/${session.user.id}`);
      } else {
        setTarget(`/auth`);
      }
    };
    run();
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/schools/:id" element={<SchoolProfile />} />
            <Route path="/gallery" element={<MyGalleryRedirect />} />
            <Route path="/gallery/user/:userId" element={<Gallery />} />
            <Route path="/gallery/:id" element={<EventGallery />} />
            <Route path="/projects" element={<MyProjectsRedirect />} />
            <Route path="/projects/:userId" element={<Projects />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
