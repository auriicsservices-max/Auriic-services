import { JSONResumeData } from '../types/jsonResume';
import { ResumeData } from '../types/resume';

export const toInternalResumeData = (jsonResume: JSONResumeData): ResumeData => {
  const linkedin = jsonResume.basics.profiles.find(p => p.network.toLowerCase() === 'linkedin')?.url || '';
  const github = jsonResume.basics.profiles.find(p => p.network.toLowerCase() === 'github')?.url || '';
  const portfolio = jsonResume.basics.website || '';

  const skillsGrouped = jsonResume.skills.map(s => ({
    category: s.name,
    items: s.keywords
  }));

  const allSkillsFlat = Array.from(new Set([
    ...jsonResume.skills.flatMap(s => s.keywords)
  ])).filter(Boolean);

  const workExperience = jsonResume.work.map(w => ({
    job_title: w.position,
    company: w.name,
    location: 'Remote',
    start_date: w.startDate || '',
    end_date: w.endDate || '',
    is_current: !w.endDate || /present|current|now/i.test(w.endDate),
    responsibilities: w.highlights || (w.summary ? [w.summary] : []),
    technologies: []
  }));

  const projects = jsonResume.projects.map(p => ({
    name: p.name,
    description: p.description || '',
    technologies: p.keywords || [],
    role: p.roles?.[0] || '',
    live_url: p.url || '',
    code_url: ''
  }));

  const education = jsonResume.education.map(e => ({
    degree: e.studyType || '',
    field_of_study: e.area || '',
    institution: e.institution,
    location: '',
    start_date: e.startDate || '',
    end_date: e.endDate || '',
    grade: e.score || ''
  }));

  const certifications = jsonResume.certificates.map(c => ({
    name: c.name,
    issuer: c.issuer || '',
    year: c.date || ''
  }));

  return {
    is_resume: true,
    parsing_confidence: 'high',
    detected_language: 'en',
    personal_info: {
      full_name: jsonResume.basics.name,
      headline: workExperience[0]?.job_title || 'Software Professional',
      email: jsonResume.basics.email || '',
      phone: jsonResume.basics.phone || '',
      location: {
        city: jsonResume.basics.location?.city || '',
        state: jsonResume.basics.location?.region || '',
        country: jsonResume.basics.location?.countryCode || ''
      },
      links: {
        linkedin,
        github,
        portfolio,
        website: jsonResume.basics.website || '',
        other: jsonResume.basics.profiles
          .filter(p => !['linkedin', 'github'].includes(p.network.toLowerCase()))
          .map(p => p.url || '')
      }
    },
    professional_summary: jsonResume.basics.summary || '',
    total_experience_years: 0,
    skills: skillsGrouped,
    all_skills: allSkillsFlat,
    work_experience: workExperience,
    projects,
    education,
    certifications,
    languages: jsonResume.languages.map(l => ({ language: l.language, proficiency: l.fluency || '' })),
    awards: jsonResume.awards.map(a => a.title),
    warnings: [],
    rawText: jsonResume.rawText || ''
  };
};
