import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const AdminLayout = React.lazy(() => import("@/components/admin/AdminLayout"));
const AdminLoginPage = React.lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminDashboard = React.lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminProjects = React.lazy(() => import("@/pages/admin/AdminProjects"));
const ProjectForm = React.lazy(() => import("@/components/admin/ProjectForm"));
const AdminBlogs = React.lazy(() => import("@/pages/admin/AdminBlogs"));
const BlogForm = React.lazy(() => import("@/components/admin/BlogForm"));
const AdminAuthors = React.lazy(() => import("@/pages/admin/AdminAuthors"));
const AdminSeries = React.lazy(() => import("@/pages/admin/AdminSeries"));
const AdminRedirects = React.lazy(() => import("@/pages/admin/AdminRedirects"));
const AdminNotFound = React.lazy(() => import("@/pages/admin/AdminNotFound"));
const AdminBlogAnalytics = React.lazy(() => import("@/pages/admin/AdminBlogAnalytics"));
const AdminBlogSettings = React.lazy(() => import("@/pages/admin/AdminBlogSettings"));
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
const AdminCauses = React.lazy(() => import("@/pages/admin/AdminCauses"));
const AdminTestScores = React.lazy(() => import("@/pages/admin/AdminTestScores"));
const AdminLogs = React.lazy(() => import("@/pages/admin/AdminLogs"));
const AdminMore = React.lazy(() => import("@/pages/admin/AdminMore"));
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
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" aria-label="Loading" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
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
                  <Route path="authors" element={<AdminAuthors />} />
                  <Route path="series" element={<AdminSeries />} />
                  <Route path="redirects" element={<AdminRedirects />} />
                  <Route path="not-found" element={<AdminNotFound />} />
                  <Route path="analytics" element={<AdminBlogAnalytics />} />
                  <Route path="blog-settings" element={<AdminBlogSettings />} />
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
                  <Route path="causes" element={<AdminCauses />} />
                  <Route path="test-scores" element={<AdminTestScores />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="more" element={<AdminMore />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
