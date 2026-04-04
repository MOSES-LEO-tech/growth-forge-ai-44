import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import ErrorBoundary from "@/components/ErrorBoundary";
import RequireAuth from "@/components/RequireAuth";
import { Loader2 } from "lucide-react";

// Lazy load pages for performance
const Recommendations = lazy(() => import("./pages/Recommendations"));
const MyApplications = lazy(() => import("./pages/MyApplications"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Schools = lazy(() => import("./pages/Schools"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const SchoolProfile = lazy(() => import("./pages/SchoolProfile"));
const Gallery = lazy(() => import("./pages/Gallery"));
const EventGallery = lazy(() => import("./pages/EventGallery"));
const Projects = lazy(() => import("./pages/Projects"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Contact = lazy(() => import("./pages/Contact"));
const Features = lazy(() => import("./pages/Features"));
const Profile = lazy(() => import("./pages/Profile"));
const StudentGallery = lazy(() => import("./pages/StudentGallery"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const SchoolGallery = lazy(() => import("./pages/SchoolGallery"));
const Achievements = lazy(() => import("./pages/Achievements"));
const SmartBuddy = lazy(() => import("./pages/SmartBuddy"));

const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50/50">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/schools" element={<Schools />} />
                  <Route path="/scholarships" element={<Scholarships />} />
                  <Route path="/schools/:id" element={<SchoolProfile />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  <Route path="/my-applications" element={<MyApplications />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/gallery/:id" element={<EventGallery />} />
                  <Route path="/buddy" element={<SmartBuddy />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route element={<RequireAuth />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:id" element={<Profile />} />
                    <Route path="/achievements" element={<Achievements />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/:id" element={<ProjectDetails />} />
                    <Route path="/school/gallery" element={<SchoolGallery />} />
                    <Route path="/school/gallery/:id" element={<EventGallery />} />
                    <Route path="/gallery/personal" element={<StudentGallery />} />
                  </Route>
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
