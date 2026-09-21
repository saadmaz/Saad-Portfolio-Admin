export interface Project {
  id: number | string;
  slug: string;
  title: string;
  tagline: string;
  date?: string;
  status: string;
  stage?: string;
  type?: string;
  category?: string;
  role?: string;
  duration?: string;
  colour?: string;
  order_index?: number;
  featured?: boolean;
  /** Defaults to visible when absent (legacy docs). Set to false to hide from the public site and sitemap. */
  published?: boolean;

  // Descriptions
  description?: string;
  long_description?: string;
  overview: string;

  // Media
  heroImage: string;
  /** Alt text for heroImage. Falls back to the project title when unset - never derived from free-text fields like tagline/description. */
  altText?: string;
  image?: string;           // legacy alias for heroImage
  images?: string[];        // legacy gallery
  screenshots?: string[];
  video?: string;           // YouTube / video URL
  videoDemo?: string;

  // Tech
  techStack: string[];
  technologies?: string[];

  // Links
  githubUrl?: string;
  github?: string;          // legacy alias for githubUrl
  liveUrl?: string;
  live_preview?: string;    // legacy alias for liveUrl
  pdfReport?: string;

  // Content
  challenges?: Array<string | { wall?: string; fix?: string; lesson?: string }>;
  learnings?: string[];
  features?: string[];
  roadmap?: string[];
  problem?: string;
  solution?: string;
  impact?: string;
  gradientStart?: string;
  gradientEnd?: string;

  // Cross-entity linking (source of truth for education/experience associations)
  linked_education_ids?: string[];
  linked_experience_ids?: string[];
}

export interface Skill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advance' | 'Expert';
  startYear: number;
  icon?: string;
}

export interface SkillSet {
  category: string;
  skills: Skill[];
}

export interface ExperienceMedia {
  media_type: 'Image' | 'Document' | 'Link' | 'Presentation';
  media_url: string;
  media_caption?: string;
}

export interface ExperienceRole {
  role_title: string;
  role_start_month?: string;
  role_start_year?: number;
  role_end_month?: string;
  role_end_year?: number;
  role_is_current: boolean;
  description?: string;
  skills?: string[];
  media?: ExperienceMedia[];
}

export interface Experience {
  id: number | string;

  // ── New schema fields ──────────────────────────────────────────
  company_name?: string;
  company_logo?: string;
  employment_type?: string;
  location_type?: 'On-site' | 'Remote' | 'Hybrid';
  is_current?: boolean;
  start_month?: string;
  start_year?: number;
  end_month?: string;
  end_year?: number;
  roles?: ExperienceRole[];
  achievements?: string;
  skills?: string[];
  media?: ExperienceMedia[];
  display_order?: number;
  is_featured?: boolean;

  // ── Legacy / backward-compat fields ───────────────────────────
  company?: string;
  companyLogo?: string;
  companyUrl?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  location?: string;
  workMode?: string;
  department?: string;
  description?: string;
  responsibilities?: string[];
  technologies?: string[];
  position?: string;
  impact?: string;
  order_index?: number;

  // ── Deprecated (kept for Firestore type-safety) ───────────────
  companyIndustry?: string;
  companySize?: string;
  teamSize?: number;
  reportsTo?: string;
  directReports?: number;
  projectsHighlighted?: string[];
  referenceAvailable?: boolean;
  linkedinUrl?: string;
  mediaLinks?: string[];
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  platform: string;
  issuer_logo: string;
  issue_date: string;
  expiry_date: string | null;
  does_not_expire: boolean;
  credential_id?: string;
  credential_url: string;
  description: string;
  skills: string[];
  category: string;
  type: string;
  tags: string[];
  pdf_document_link: string;
  is_verifiable: boolean;
  is_featured: boolean;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  author: string;
  image?: string;
  tags?: string[];
  published: boolean;
  is_latest?: boolean;

  /* SEO */
  metaDescription?: string;
  keywords?: string;          // comma-separated

  /* Publishing */
  scheduledDate?: string;     // ISO string; empty = not scheduled
  publishedAt?: string;
  lastUpdatedAt?: string;

  /* Content extras */
  tableOfContents?: boolean;
  socialShareEnabled?: boolean;

  /* CTA */
  ctaText?: string;
  ctaUrl?: string;

  /* Related */
  relatedPostSlugs?: string[];
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
  icon?: string;
  link?: string;
}

export interface Language {
  id: string;
  name: string;
  level: string; // e.g., 'Native', 'Fluent', 'Professional'
  percentage: number;
}

export interface Hackathon {
  id: string;
  name: string;
  organizer: string;
  date: string;
  role: string;
  projectTitle?: string;
  achievement?: string;
  description: string;
  image?: string;
  link?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  position: string;
  company: string;
  content: string;
  avatar?: string;
  link?: string;
}

export interface VolunteerExperience {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  image?: string;
  link?: string;
}

export interface EducationProject {
  project_title: string;
  project_description?: string;
  project_url?: string;
  project_thumbnail?: string;
}

export interface EducationMedia {
  media_type: 'Image' | 'Document' | 'Link' | 'Presentation';
  media_url: string;
  media_caption: string;
  media_description?: string;
  media_date_month?: string;
  media_date_year?: number;
  thumbnail_url?: string;
}

export interface EducationAward {
  award_title: string;
  award_issuer?: string;
  award_date_month?: string;
  award_date_year?: number;
  award_description?: string;
}

export interface Education {
  id: string;

  // Institution
  school_name: string;
  school_logo: string;
  school_website_url?: string;

  // Degree
  degree?: string;
  field_of_study?: string;

  // Duration
  start_month?: string;
  start_year?: number;
  end_month?: string;
  end_year?: number;
  is_current: boolean;

  // Academic
  grade?: string;
  show_grade_publicly?: boolean;
  activities_and_societies?: string;
  description?: string;

  // Arrays
  skills?: string[];
  projects?: EducationProject[];
  media?: EducationMedia[];
  honors_and_awards?: EducationAward[];

  // Settings
  is_featured?: boolean;
  display_order?: number;
  is_published?: boolean;

  // Timestamps
  created_at?: FirestoreLikeTimestamp;
  updated_at?: FirestoreLikeTimestamp;

  // Legacy backward-compat (old Firestore docs)
  institution?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  logo?: string;
}

export type FirestoreLikeTimestamp =
  | { toDate: () => Date }
  | Date
  | string
  | number
  | null
  | undefined;

export interface ActivityLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  adminId: string;
  adminEmail: string;
  details?: string;
  timestamp: FirestoreLikeTimestamp;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  created_at: FirestoreLikeTimestamp;
  read: boolean;
}

export interface Event {
  id: string;
  title: string;
  organizer: string;
  date: string;
  location: string;
  description: string;
  role?: string;         // Your participation role: Speaker, Host, Organizer, etc.
  attendees?: string;    // e.g. "500+", "2,000+"
  highlights?: string[];
  image?: string;
  images?: string[];
  link?: string;
  tags?: string[];
  type: string;          // Event category: Conference, Workshop, Summit, etc.
}

export interface Newsletter {
  id: string;
  title: string;
  description: string;
  date: string;
  content_url: string;
  image?: string;
  type: 'founder' | 'cse' | string;
  tags?: string[];
}

export interface Course {
  id: string;
  name: string;
  school: string;
  associatedWith?: string;
  completedDate?: string;
  description?: string;
  link?: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher: string;
  date: string;
  description?: string;
  link?: string;
  authors?: string[];
  tags?: string[];
}

export interface Patent {
  id: string;
  title: string;
  patentOffice: string;
  patentNumber?: string;
  status: string;
  filingDate?: string;
  issueDate?: string;
  description?: string;
  link?: string;
}

export interface TestScore {
  id: string;
  testName: string;
  score: string;
  date?: string;
  description?: string;
}

export interface Organization {
  id: string;
  name: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  link?: string;
  image?: string;
}

export interface Cause {
  id: string;
  name: string;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}