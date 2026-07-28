import { ResumeData } from '../types/resume';
import { JSONResumeData } from '../types/jsonResume';

export const toJSONResumeData = (internal: ResumeData): JSONResumeData => {
  return {
    basics: {
      name: internal.personal_info.full_name || '',
      email: internal.personal_info.email || '',
      phone: internal.personal_info.phone || '',
      website: internal.personal_info.links.website || internal.personal_info.links.portfolio || '',
      summary: internal.professional_summary || '',
      location: {
        city: internal.personal_info.location?.city || undefined,
        region: internal.personal_info.location?.state || undefined,
        countryCode: internal.personal_info.location?.country || undefined,
      },
      profiles: [
        ...(internal.personal_info.links.linkedin ? [{ network: 'LinkedIn', username: '', url: internal.personal_info.links.linkedin }] : []),
        ...(internal.personal_info.links.github ? [{ network: 'GitHub', username: '', url: internal.personal_info.links.github }] : []),
        ...(internal.personal_info.links.portfolio ? [{ network: 'Portfolio', username: '', url: internal.personal_info.links.portfolio }] : []),
        ...(internal.personal_info.links.other ? internal.personal_info.links.other.map(url => ({ network: 'Other', username: '', url })) : [])
      ],
    },
    work: internal.work_experience.map(e => ({
      name: e.company || '',
      position: e.job_title || '',
      startDate: e.start_date || '',
      endDate: e.end_date || '',
      summary: e.responsibilities?.join('\n') || '',
      highlights: e.responsibilities || [],
    })),
    education: internal.education.map(e => ({
      institution: e.institution || '',
      area: e.field_of_study || '',
      studyType: e.degree || '',
      startDate: e.start_date || '',
      endDate: e.end_date || '',
      score: e.grade || undefined
    })),
    skills: internal.skills.map(s => ({
      name: s.category,
      keywords: s.items,
    })),
    projects: internal.projects.map(p => ({
      name: p.name || '',
      description: p.description || '',
      keywords: p.technologies || [],
      highlights: p.description ? [p.description] : [],
      roles: p.role ? [p.role] : [],
      url: p.live_url || undefined
    })),
    certificates: (internal.certifications || []).map(c => typeof c === 'string' ? { name: c, date: undefined, issuer: undefined } : {
      name: c.name || '',
      date: c.year || undefined,
      issuer: c.issuer || undefined
    }),
    publications: [],
    awards: (internal.awards || []).map(title => ({ title })),
    languages: (internal.languages || []).map(l => typeof l === 'string' ? { language: l, fluency: undefined } : {
      language: l.language,
      fluency: l.proficiency || undefined
    }),
    interests: [],
    references: [],
    volunteer: [],
    rawText: internal.rawText || '',
  };
};
