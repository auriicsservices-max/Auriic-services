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
  name: z.string().default(''),
  fullName: z.string().optional(),
  company: z.string().optional(),
  contact: z.object({
    email: z.string().default(''),
    phone: z.string().default(''),
    linkedin: z.string().default(''),
    github: z.string().default(''),
    portfolio: z.string().default(''),
  }),
  links: z.array(z.object({
    type: z.string(),
    url: z.string()
  })).default([]),
  location: z.string().optional(),
  locationDetails: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  profile: z.string().default(''),
  domainFocus: z.string().default(''),
  totalExperienceYears: z.number().default(0),
  education: z.array(z.object({
    institution: z.string().default(''),
    degree: z.string().default(''),
    field: z.string().optional(),
    duration: z.string().default(''),
    gpa: z.string().optional(),
    location: z.string().optional(),
  })).default([]),
  experience: z.array(z.object({
    title: z.string().default(''),
    company: z.string().default(''),
    duration: z.string().default(''),
    location: z.string().optional(),
    responsibilities: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string().default(''),
    technologies: z.array(z.string()).default([]),
    duration: z.string().default(''),
    description: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]),
  })).default([]),
  skills: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    libraries: z.array(z.string()).default([]),
    other: z.array(z.string()).default([]),
  }),
  achievements: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  rawText: z.string().default(''),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
