import { JSONResumeData } from '../types/jsonResume';
import { ResumeData } from '../types/resume';

export const toInternalResumeData = (jsonResume: JSONResumeData): ResumeData => {
  return {
    name: jsonResume.basics.name,
    fullName: jsonResume.basics.name,
    contact: {
      email: jsonResume.basics.email,
      phone: jsonResume.basics.phone,
      linkedin: jsonResume.basics.profiles.find(p => p.network === 'LinkedIn')?.url || '',
      github: jsonResume.basics.profiles.find(p => p.network === 'GitHub')?.url || '',
      portfolio: jsonResume.basics.website || '',
    },
    links: jsonResume.basics.profiles.map(p => ({ type: p.network, url: p.url || '' })),
    location: jsonResume.basics.location?.city || '',
    locationDetails: {
      city: jsonResume.basics.location?.city,
      state: jsonResume.basics.location?.region,
      country: jsonResume.basics.location?.countryCode,
      postalCode: jsonResume.basics.location?.postalCode,
    },
    profile: jsonResume.basics.summary,
    domainFocus: '',
    totalExperienceYears: 0,
    education: jsonResume.education.map(e => ({
      institution: e.institution,
      degree: e.studyType || '',
      field: e.area,
      duration: `${e.startDate || ''} - ${e.endDate || ''}`,
    })),
    experience: jsonResume.work.map(w => ({
      title: w.position,
      company: w.name,
      duration: `${w.startDate || ''} - ${w.endDate || ''}`,
      responsibilities: w.highlights,
    })),
    projects: jsonResume.projects.map(p => ({
      name: p.name,
      technologies: p.keywords,
      duration: `${p.startDate || ''} - ${p.endDate || ''}`,
      description: p.description ? [p.description] : [],
      links: p.url ? [p.url] : [],
    })),
    skills: {
      languages: jsonResume.skills.filter(s => s.name === 'Language').flatMap(s => s.keywords),
      frameworks: jsonResume.skills.filter(s => s.name === 'Framework').flatMap(s => s.keywords),
      databases: jsonResume.skills.filter(s => s.name === 'Database').flatMap(s => s.keywords),
      tools: jsonResume.skills.filter(s => s.name === 'Tool').flatMap(s => s.keywords),
      libraries: [],
      other: jsonResume.skills.filter(s => !['Language', 'Framework', 'Database', 'Tool'].includes(s.name)).flatMap(s => s.keywords),
    },
    achievements: [],
    languages: jsonResume.languages.map(l => l.language),
    interests: jsonResume.interests.map(i => i.name),
    rawText: jsonResume.rawText,
  };
};
