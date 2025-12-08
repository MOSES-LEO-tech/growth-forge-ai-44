import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Profile from "./pages/Profile";
import StudentGallery from "./pages/StudentGallery";
import ProjectDetails from "./pages/ProjectDetails";
import SchoolGallery from "./pages/SchoolGallery";
import Achievements from "./pages/Achievements";
import SmartBuddy from "./pages/SmartBuddy";

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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/features" element={<Features />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/schools" element={<Schools />} />
              <Route path="/schools/:id" element={<SchoolProfile />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/:id" element={<EventGallery />} />
              <Route path="/gallery/personal" element={<StudentGallery />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/school/gallery" element={<SchoolGallery />} />
              <Route path="/school/gallery/:id" element={<EventGallery />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/buddy" element={<SmartBuddy />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<Profile />} />
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
