import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ProjectService } from '@/services/project-service';
import { BlogService } from '@/services/blog-service';
import { CommonService } from '@/shared/services/common-service';
import type { BlogPost, Certificate, Event, Message, Project } from '@/types';
import type { CountKey } from './navConfig';

export const OVERVIEW_QUERY_KEY = ['admin-overview'] as const;

export interface AdminOverview {
  projects: Project[];
  blogs: BlogPost[];
  certificates: Certificate[];
  events: Event[];
  messages: Message[];
  counts: Partial<Record<CountKey, number>>;
}

// One failing collection shouldn't blank the whole sidebar.
const settle = async <T,>(p: Promise<T[]>): Promise<T[]> => {
  try { return await p; } catch { return []; }
};

async function fetchOverview(): Promise<AdminOverview> {
  const [
    projects, blogs, messages, experience, skills, certificates, events, education,
    awards, languages, testimonials, hackathons, newsletters, courses, publications,
    patents, organizations, volunteer, causes, testScores,
  ] = await Promise.all([
    settle(ProjectService.getAll()),
    settle(BlogService.getAll()),
    settle(CommonService.getMessages()),
    settle(CommonService.getWorkExperience()),
    settle(CommonService.getSkills()),
    settle(CommonService.getCertificates()),
    settle(CommonService.getEvents()),
    settle(CommonService.getEducation()),
    settle(CommonService.getAwards()),
    settle(CommonService.getLanguages()),
    settle(CommonService.getTestimonials()),
    settle(CommonService.getHackathons()),
    settle(CommonService.getNewsletters()),
    settle(CommonService.getCourses()),
    settle(CommonService.getPublications()),
    settle(CommonService.getPatents()),
    settle(CommonService.getOrganizations()),
    settle(CommonService.getVolunteerExperience()),
    settle(CommonService.getCauses()),
    settle(CommonService.getTestScores()),
  ]);

  return {
    projects,
    blogs,
    certificates,
    events,
    messages,
    counts: {
      projects: projects.length,
      blogs: blogs.length,
      experience: experience.length,
      skills: skills.reduce((n, set) => n + (set.skills?.length ?? 0), 0),
      certificates: certificates.length,
      events: events.length,
      education: education.length,
      awards: awards.length,
      languages: languages.length,
      testimonials: testimonials.length,
      hackathons: hackathons.length,
      newsletters: newsletters.length,
      courses: courses.length,
      publications: publications.length,
      patents: patents.length,
      organizations: organizations.length,
      volunteer: volunteer.length,
      causes: causes.length,
      testScores: testScores.length,
      unread: messages.filter((m) => !m.read).length,
    },
  };
}

/** Collections + counts shared by the shell, the dashboard and ⌘K. */
export const useAdminOverview = () =>
  useQuery({ queryKey: OVERVIEW_QUERY_KEY, queryFn: fetchOverview, staleTime: 60 * 1000 });

/**
 * Opens a page's create drawer when the URL carries `?new=1` (from Quick
 * create, the New menu or ⌘K), then strips the param so a refresh or back
 * navigation doesn't reopen it.
 */
export const useCreateIntent = (onCreate: () => void) => {
  const [params, setParams] = useSearchParams();
  const wantsNew = params.get('new') === '1';
  useEffect(() => {
    if (!wantsNew) return;
    onCreate();
    setParams((p) => { p.delete('new'); return p; }, { replace: true });
    // onCreate is a fresh closure each render; the param is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew]);
};
