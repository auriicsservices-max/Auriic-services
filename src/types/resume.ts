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
  is_resume: z.boolean().default(true),
  parsing_confidence: z.enum(['high', 'medium', 'low']).default('high'),
  detected_language: z.string().nullable().default('en'),

  contact: z.object({
    full_name: z.string().nullable().default(''),
    email: z.string().nullable().default(''),
    mobile: z.string().nullable().default(''),
    designation: z.string().nullable().default(''),
    location: z.string().nullable().default(''),
    address: z.string().nullable().default('')
  }).optional().default({
    full_name: '',
    email: '',
    mobile: '',
    designation: '',
    location: '',
    address: ''
  }),

  personal_info: z.object({
    full_name: z.string().nullable().default(''),
    headline: z.string().nullable().default(''),
    email: z.string().nullable().default(''),
    phone: z.string().nullable().default(''),
    location: z.object({
      city: z.string().nullable().default(''),
      state: z.string().nullable().default(''),
      country: z.string().nullable().default('')
    }).optional().default({
      city: '',
      state: '',
      country: ''
    }),
    links: z.object({
      linkedin: z.string().nullable().default(''),
      github: z.string().nullable().default(''),
      portfolio: z.string().nullable().default(''),
      website: z.string().nullable().default(''),
      other: z.array(z.string()).default([])
    }).default({
      linkedin: '',
      github: '',
      portfolio: '',
      website: '',
      other: []
    })
  }).default({
    full_name: '',
    headline: '',
    email: '',
    phone: '',
    location: { city: '', state: '', country: '' },
    links: { linkedin: '', github: '', portfolio: '', website: '', other: [] }
  }),

  links: z.object({
    linkedin: z.string().nullable().default(''),
    github: z.string().nullable().default(''),
    portfolio: z.string().nullable().default(''),
    website: z.string().nullable().default(''),
    other_urls: z.array(z.string()).default([])
  }).optional().default({
    linkedin: '',
    github: '',
    portfolio: '',
    website: '',
    other_urls: []
  }),

  professional_summary: z.string().nullable().default(''),
  total_experience_years: z.number().nullable().default(0),
  career_level: z.string().nullable().optional().default('Mid-Level'),
  primary_role: z.string().nullable().optional().default(''),

  technical_skills: z.object({
    languages: z.array(z.string()).default([]),
    frontend: z.array(z.string()).default([]),
    backend: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    cloud_devops: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    cms_ecommerce: z.array(z.string()).default([]),
    other: z.array(z.string()).default([])
  }).optional().default({
    languages: [],
    frontend: [],
    backend: [],
    databases: [],
    cloud_devops: [],
    tools: [],
    cms_ecommerce: [],
    other: []
  }),

  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()).default([])
  })).default([]),
  all_skills: z.array(z.string()).default([]),

  work_experience: z.array(z.object({
    job_title: z.string().nullable().default(''),
    company: z.string().nullable().default(''),
    location: z.string().nullable().default(''),
    start_date: z.string().nullable().default(''),
    end_date: z.string().nullable().default(''),
    duration: z.string().nullable().optional().default(''),
    is_current: z.boolean().default(false),
    responsibilities: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    key_achievements: z.array(z.string()).optional().default([]),
    achievements: z.array(z.string()).optional().default([])
  })).default([]),

  key_projects: z.array(z.object({
    name: z.string().nullable().default(''),
    description: z.string().nullable().default(''),
    tech_stack: z.array(z.string()).default([]),
    live_url: z.string().nullable().default(''),
    code_url: z.string().nullable().default(''),
    highlights: z.array(z.string()).default([])
  })).optional().default([]),

  projects: z.array(z.object({
    name: z.string().nullable().default(''),
    description: z.string().nullable().default(''),
    technologies: z.array(z.string()).default([]),
    role: z.string().nullable().default(''),
    live_url: z.string().nullable().default(''),
    code_url: z.string().nullable().default('')
  })).default([]),

  education: z.array(z.object({
    degree: z.string().nullable().default(''),
    field_of_study: z.string().nullable().default(''),
    institution: z.string().nullable().default(''),
    location: z.string().nullable().default(''),
    start_date: z.string().nullable().default(''),
    end_date: z.string().nullable().default(''),
    start_year: z.string().nullable().optional().default(''),
    end_year: z.string().nullable().optional().default(''),
    grade: z.string().nullable().default(''),
    gpa: z.string().nullable().optional().default(''),
    honors: z.string().nullable().optional().default('')
  })).default([]),

  certifications: z.array(z.union([
    z.string(),
    z.object({
      name: z.string().nullable().default(''),
      issuer: z.string().nullable().default(''),
      year: z.string().nullable().default('')
    })
  ])).default([]),

  publications: z.array(z.object({
    title: z.string().nullable().default(''),
    publisher: z.string().nullable().default(''),
    release_date: z.string().nullable().default(''),
    summary: z.string().nullable().default('')
  })).optional().default([]),

  volunteer: z.array(z.object({
    organization: z.string().nullable().default(''),
    position: z.string().nullable().default(''),
    start_date: z.string().nullable().default(''),
    end_date: z.string().nullable().default(''),
    summary: z.string().nullable().default('')
  })).optional().default([]),

  volunteering: z.array(z.union([
    z.string(),
    z.object({
      organization: z.string().nullable().default(''),
      position: z.string().nullable().default(''),
      start_date: z.string().nullable().default(''),
      end_date: z.string().nullable().default(''),
      summary: z.string().nullable().default('')
    })
  ])).optional().default([]),

  interests: z.array(z.union([
    z.string(),
    z.object({
      name: z.string().nullable().default(''),
      keywords: z.array(z.string()).default([])
    })
  ])).optional().default([]),

  languages: z.array(z.union([
    z.string(),
    z.object({
      language: z.string(),
      proficiency: z.string().nullable().default('')
    })
  ])).default([]),

  awards: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  rawText: z.string().default('')
});

export type ResumeData = z.infer<typeof ResumeSchema>;
