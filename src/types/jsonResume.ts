import { z } from 'zod';

export const JSONResumeSchema = z.object({
  basics: z.object({
    name: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
    website: z.string().default(''),
    summary: z.string().default(''),
    location: z.object({
      address: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
      countryCode: z.string().optional(),
      region: z.string().optional(),
    }).optional(),
    profiles: z.array(z.object({
      network: z.string(),
      username: z.string(),
      url: z.string().optional(),
    })).default([]),
  }),
  work: z.array(z.object({
    name: z.string(),
    position: z.string(),
    url: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string(),
    url: z.string().optional(),
    area: z.string().optional(),
    studyType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    score: z.string().optional(),
  })).default([]),
  skills: z.array(z.object({
    name: z.string(),
    level: z.string().optional(),
    keywords: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    url: z.string().optional(),
    roles: z.array(z.string()).default([]),
  })).default([]),
  certificates: z.array(z.object({
    name: z.string(),
    date: z.string().optional(),
    issuer: z.string().optional(),
    url: z.string().optional(),
  })).default([]),
  publications: z.array(z.object({
    name: z.string(),
    publisher: z.string().optional(),
    releaseDate: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
  })).default([]),
  awards: z.array(z.object({
    title: z.string(),
    date: z.string().optional(),
    awarder: z.string().optional(),
    summary: z.string().optional(),
  })).default([]),
  languages: z.array(z.object({
    language: z.string(),
    fluency: z.string().optional(),
  })).default([]),
  interests: z.array(z.object({
    name: z.string(),
    keywords: z.array(z.string()).default([]),
  })).default([]),
  references: z.array(z.object({
    name: z.string(),
    reference: z.string().optional(),
  })).default([]),
  volunteer: z.array(z.object({
    organization: z.string(),
    position: z.string(),
    url: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).default([]),
  })).default([]),
  rawText: z.string().default(''),
});

export type JSONResumeData = z.infer<typeof JSONResumeSchema>;
