import { ResumeData } from '../types/resume';
import { JSONResumeData } from '../types/jsonResume';

export const toJSONResumeData = (internal: ResumeData): JSONResumeData => {
  return {
    basics: {
      name: internal.name || '',
      email: internal.contact.email || '',
      phone: internal.contact.phone || '',
      website: internal.contact.portfolio || '',
      summary: internal.profile || '',
      location: {
        city: internal.locationDetails?.city,
        region: internal.locationDetails?.state,
        countryCode: internal.locationDetails?.country,
        postalCode: internal.locationDetails?.postalCode,
      },
      profiles: internal.links.map(l => ({ network: l.type, username: '', url: l.url })),
    },
    work: internal.experience.map(e => ({
      name: e.company,
      position: e.title,
      startDate: e.duration.split(' - ')[0],
      endDate: e.duration.split(' - ')[1],
      summary: e.responsibilities.join('\n'),
      highlights: e.responsibilities,
    })),
    education: internal.education.map(e => ({
      institution: e.institution,
      area: e.field,
      studyType: e.degree,
      startDate: e.duration.split(' - ')[0],
      endDate: e.duration.split(' - ')[1],
    })),
    skills: Object.entries(internal.skills).map(([category, keywords]) => ({
      name: category,
      keywords: keywords as string[],
    })),
    projects: internal.projects.map(p => ({
      name: p.name,
      description: p.description.join(' '),
      keywords: p.technologies,
      highlights: p.description,
      roles: [],
    })),
    certificates: [],
    publications: [],
    awards: [],
    languages: internal.languages.map(l => ({ language: l })),
    interests: internal.interests.map(i => ({ name: i, keywords: [] })),
    references: [],
    volunteer: [],
    rawText: internal.rawText,
  };
};
