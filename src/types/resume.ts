import { z } from 'zod';

export type ProcessingStatus = 'uploading' | 'extracting' | 'analyzing' | 'saving' | 'completed' | 'failed';

export interface ResumeProcessingJob {
  id: string;
  filename: string;
  size: number;
  pages: number;
  status: ProcessingStatus;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
  startTime: number;
}

export const ResumeSchema = z.object({
  is_resume: z.boolean(),
  parsing_confidence: z.enum(['high', 'medium', 'low']),
  detected_language: z.string().nullable().default('en'),
  personal_info: z.object({
    full_name: z.string().nullable(),
    headline: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.object({
      city: z.string().nullable(),
      state: z.string().nullable(),
      country: z.string().nullable()
    }),
    links: z.object({
      linkedin: z.string().nullable(),
      github: z.string().nullable(),
      portfolio: z.string().nullable(),
      website: z.string().nullable(),
      other: z.array(z.string()).default([])
    })
  }),
  professional_summary: z.string().nullable(),
  total_experience_years: z.number().nullable(),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()).default([])
  })).default([]),
  all_skills: z.array(z.string()).default([]),
  work_experience: z.array(z.object({
    job_title: z.string().nullable(),
    company: z.string().nullable(),
    location: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    is_current: z.boolean(),
    responsibilities: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    key_achievements: z.array(z.string()).optional()
  })).default([]),
  projects: z.array(z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    technologies: z.array(z.string()).default([]),
    role: z.string().nullable(),
    live_url: z.string().nullable(),
    code_url: z.string().nullable()
  })).default([]),
  education: z.array(z.object({
    degree: z.string().nullable(),
    field_of_study: z.string().nullable(),
    institution: z.string().nullable(),
    location: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    grade: z.string().nullable()
  })).default([]),
  certifications: z.array(z.object({
    name: z.string().nullable(),
    issuer: z.string().nullable(),
    year: z.string().nullable()
  })).default([]),
  publications: z.array(z.object({
    title: z.string().nullable(),
    publisher: z.string().nullable(),
    release_date: z.string().nullable(),
    summary: z.string().nullable()
  })).optional(),
  volunteer: z.array(z.object({
    organization: z.string().nullable(),
    position: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    summary: z.string().nullable()
  })).optional(),
  interests: z.array(z.object({
    name: z.string().nullable(),
    keywords: z.array(z.string()).default([])
  })).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string().nullable()
  })).default([]),
  awards: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  rawText: z.string().default('')
});

export type ResumeData = z.infer<typeof ResumeSchema>;

