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
    job_title: w.position || '',
    company: w.name || '',
    location: 'Remote',
    start_date: w.startDate || '',
    end_date: w.endDate || '',
    duration: '',
    is_current: !w.endDate || /present|current|now/i.test(w.endDate),
    responsibilities: w.highlights || (w.summary ? [w.summary] : []),
    technologies: [],
    key_achievements: [],
    achievements: []
  }));

  const projects = jsonResume.projects.map(p => ({
    name: p.name || '',
    description: p.description || '',
    technologies: p.keywords || [],
    role: p.roles?.[0] || '',
    live_url: p.url || '',
    code_url: ''
  }));

  const keyProjects = jsonResume.projects.map(p => ({
    name: p.name || '',
    description: p.description || '',
    tech_stack: p.keywords || [],
    live_url: p.url || '',
    code_url: '',
    highlights: p.highlights || []
  }));

  const education = jsonResume.education.map(e => ({
    degree: e.studyType || '',
    field_of_study: e.area || '',
    course: e.area || '',
    specialization: '',
    institution: e.institution || '',
    board: '',
    location: '',
    duration: e.startDate ? `${e.startDate} - ${e.endDate || 'Present'}` : (e.endDate || ''),
    start_date: e.startDate || '',
    end_date: e.endDate || '',
    start_year: e.startDate || '',
    end_year: e.endDate || '',
    grade: e.score || '',
    gpa: e.score || '',
    honors: '',
    certifications: []
  }));

  const certifications = jsonResume.certificates.map(c => ({
    name: c.name || '',
    issuer: c.issuer || '',
    year: c.date || ''
  }));

  const fullName = jsonResume.basics.name || '';
  const email = jsonResume.basics.email || '';
  const phone = jsonResume.basics.phone || '';
  const headline = workExperience[0]?.job_title || 'Software Professional';
  const locationStr = jsonResume.basics.location?.city 
    ? `${jsonResume.basics.location.city}, ${jsonResume.basics.location.countryCode || ''}` 
    : '';

  return {
    is_resume: true,
    parsing_confidence: 'high',
    detected_language: 'en',
    contact: {
      full_name: fullName,
      email: email,
      mobile: phone,
      designation: headline,
      location: locationStr,
      address: locationStr
    },
    personal_info: {
      full_name: fullName,
      headline,
      email: email,
      phone: phone,
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
    links: {
      linkedin,
      github,
      portfolio,
      website: jsonResume.basics.website || '',
      other_urls: jsonResume.basics.profiles
        .filter(p => !['linkedin', 'github'].includes(p.network.toLowerCase()))
        .map(p => p.url || '')
    },
    professional_summary: jsonResume.basics.summary || '',
    education_confidence: education.length > 0 ? 'high' : 'low',
    summary_confidence: jsonResume.basics.summary ? 'high' : 'low',
    needs_review: education.length === 0 || !jsonResume.basics.summary,
    review_reasons: [
      ...(education.length === 0 ? ['Education section missing or incomplete'] : []),
      ...(!jsonResume.basics.summary ? ['Professional summary missing'] : [])
    ],
    total_experience_years: 0,
    career_level: 'Mid-Level',
    primary_role: headline,
    technical_skills: {
      languages: [],
      frontend: [],
      backend: [],
      databases: [],
      cloud_devops: [],
      tools: [],
      cms_ecommerce: [],
      other: allSkillsFlat
    },
    skills: skillsGrouped,
    all_skills: allSkillsFlat,
    work_experience: workExperience,
    projects,
    key_projects: keyProjects,
    education,
    certifications,
    publications: [],
    volunteer: [],
    volunteering: [],
    interests: [],
    languages: jsonResume.languages.map(l => ({ language: l.language, proficiency: l.fluency || '' })),
    awards: jsonResume.awards.map(a => a.title),
    warnings: [],
    rawText: jsonResume.rawText || ''
  };
};
