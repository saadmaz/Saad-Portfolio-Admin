import React, { Suspense } from "react";
import { LazyMotion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// domMax powers the AnimatePresence lightbox in ProjectForm's image gallery
const loadMotionFeatures = () =>
  import("framer-motion").then((mod) => mod.domMax);

const AdminLayout = React.lazy(() => import("@/components/admin/AdminLayout"));
const AdminLoginPage = React.lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboard = React.lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminProjects = React.lazy(() => import("@/pages/admin/AdminProjects"));
const ProjectForm = React.lazy(() => import("@/components/admin/ProjectForm"));
const AdminBlogs = React.lazy(() => import("@/pages/admin/AdminBlogs"));
const BlogForm = React.lazy(() => import("@/components/admin/BlogForm"));
const AdminExperience = React.lazy(() => import("@/pages/admin/AdminExperience"));
const ExperienceForm = React.lazy(() => import("@/components/admin/ExperienceForm"));
const AdminSkills = React.lazy(() => import("@/pages/admin/AdminSkills"));
const AdminCertificates = React.lazy(() => import("@/pages/admin/AdminCertificates"));
const CertificateForm = React.lazy(() => import("@/components/admin/CertificateForm"));
const AdminAwards = React.lazy(() => import("@/pages/admin/AdminAwards"));
const AdminLanguages = React.lazy(() => import("@/pages/admin/AdminLanguages"));
const AdminHackathons = React.lazy(() => import("@/pages/admin/AdminHackathons"));
const AdminTestimonials = React.lazy(() => import("@/pages/admin/AdminTestimonials"));
const AdminVolunteer = React.lazy(() => import("@/pages/admin/AdminVolunteer"));
const AdminEducation = React.lazy(() => import("@/pages/admin/AdminEducation"));
const EducationForm = React.lazy(() => import("@/components/admin/EducationForm"));
const AdminEvents = React.lazy(() => import("@/pages/admin/AdminEvents"));
const AdminNewsletters = React.lazy(() => import("@/pages/admin/AdminNewsletters"));
const AdminMessages = React.lazy(() => import("@/pages/admin/AdminMessages"));
const AdminCourses = React.lazy(() => import("@/pages/admin/AdminCourses"));
const AdminPublications = React.lazy(() => import("@/pages/admin/AdminPublications"));
const AdminPatents = React.lazy(() => import("@/pages/admin/AdminPatents"));
const AdminOrganizations = React.lazy(() => import("@/pages/admin/AdminOrganizations"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      <span className="text-sm text-muted-foreground font-medium animate-pulse">Loading...</span>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LazyMotion features={loadMotionFeatures}>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<AdminLoginPage />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="projects" element={<AdminProjects />} />
                    <Route path="projects/new" element={<ProjectForm />} />
                    <Route path="projects/:id" element={<ProjectForm />} />
                    <Route path="blogs" element={<AdminBlogs />} />
                    <Route path="blogs/new" element={<BlogForm />} />
                    <Route path="blogs/:id" element={<BlogForm />} />
                    <Route path="experience" element={<AdminExperience />} />
                    <Route path="experience/new" element={<ExperienceForm />} />
                    <Route path="experience/:id" element={<ExperienceForm />} />
                    <Route path="skills" element={<AdminSkills />} />
                    <Route path="certificates" element={<AdminCertificates />} />
                    <Route path="certificates/new" element={<CertificateForm />} />
                    <Route path="certificates/:id" element={<CertificateForm />} />
                    <Route path="awards" element={<AdminAwards />} />
                    <Route path="languages" element={<AdminLanguages />} />
                    <Route path="hackathons" element={<AdminHackathons />} />
                    <Route path="testimonials" element={<AdminTestimonials />} />
                    <Route path="volunteer" element={<AdminVolunteer />} />
                    <Route path="education" element={<AdminEducation />} />
                    <Route path="education/new" element={<EducationForm />} />
                    <Route path="education/:id" element={<EducationForm />} />
                    <Route path="events" element={<AdminEvents />} />
                    <Route path="newsletters" element={<AdminNewsletters />} />
                    <Route path="messages" element={<AdminMessages />} />
                    <Route path="courses" element={<AdminCourses />} />
                    <Route path="publications" element={<AdminPublications />} />
                    <Route path="patents" element={<AdminPatents />} />
                    <Route path="organizations" element={<AdminOrganizations />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </LazyMotion>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
