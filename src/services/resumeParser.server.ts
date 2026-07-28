import mammoth from 'mammoth';
import nlp from 'compromise';
import * as chrono from 'chrono-node';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { ResumeData, ResumeSchema } from '../types/resume';
import * as pdfParseModule from 'pdf-parse';

// Resolve pdf-parse correctly in both ESM (dev) and CommonJS (prod bundle)
async function getPDFParser(): Promise<any> {
  // 1. Try checking the statically imported module namespace
  const mod = pdfParseModule as any;
  if (typeof mod === 'function' || (mod && typeof mod.PDFParse === 'function')) {
    return mod;
  }
  if (mod && (typeof mod.default === 'function' || (mod.default && typeof mod.default.PDFParse === 'function'))) {
    return mod.default;
  }
  if (mod && mod.default && (typeof mod.default.default === 'function' || (mod.default.default && typeof mod.default.default.PDFParse === 'function'))) {
    return mod.default.default;
  }

  // 2. Try dynamic import
  try {
    const imported = (await import('pdf-parse')) as any;
    if (typeof imported === 'function' || (imported && typeof imported.PDFParse === 'function')) return imported;
    if (imported && (typeof imported.default === 'function' || (imported.default && typeof imported.default.PDFParse === 'function'))) return imported.default;
    if (imported && imported.default && (typeof imported.default.default === 'function' || (imported.default.default && typeof imported.default.default.PDFParse === 'function'))) {
      return imported.default.default;
    }
  } catch (e) {
    // ignore
  }

  // 3. Try dynamic require if in CommonJS environment or tsx
  try {
    if (typeof require !== 'undefined') {
      const required = require('pdf-parse');
      if (typeof required === 'function' || (required && typeof required.PDFParse === 'function')) return required;
      if (required && (typeof required.default === 'function' || (required.default && typeof required.default.PDFParse === 'function'))) return required.default;
    }
  } catch (e) {
    // ignore
  }

  // 4. Try node module bridge
  try {
    const { createRequire } = await import('module');
    const requireBridge = createRequire(import.meta.url);
    const required = requireBridge('pdf-parse');
    if (typeof required === 'function' || (required && typeof required.PDFParse === 'function')) return required;
    if (required && (typeof required.default === 'function' || (required.default && typeof required.default.PDFParse === 'function'))) return required.default;
  } catch (e) {
    // ignore
  }

  throw new Error("PDF parsing library (pdf-parse) not available or could not be loaded");
}

export class RobustResumeParser {
  async parseBuffer(buffer: Buffer, mimetype: string): Promise<ResumeData> {
    let text = '';

    if (mimetype === 'application/pdf') {
      const pdfLib = await getPDFParser();
      if (pdfLib && typeof pdfLib.PDFParse === 'function') {
        const u8 = new Uint8Array(buffer);
        const parser = new pdfLib.PDFParse({ data: u8 });
        const result = await parser.getText();
        text = result.text;
      } else if (typeof pdfLib === 'function') {
        const data = await pdfLib(buffer);
        text = data.text;
      } else if (pdfLib && typeof pdfLib.default === 'function') {
        const data = await pdfLib.default(buffer);
        text = data.text;
      } else {
        throw new Error("PDF parsing library loaded but has unknown API structure");
      }
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      text = data.value;
    } else {
      text = buffer.toString('utf-8');
    }

    return this.parseText(text);
  }

  async parseText(text: string): Promise<ResumeData> {
    const doc = nlp(text);
    
    // 1. Extract Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : '';

    // 1a. Extract Location
    let locationString = '';
    const places = doc.places().out('array');
    if (places.length > 0) {
        locationString = places[0];
    } else {
        const locationMatch = text.match(/([A-Za-z\s]+),\s*([A-Za-z]{2,})/);
        if (locationMatch) {
            locationString = locationMatch[0];
        }
    }
    
    let city = '';
    let state = '';
    let country = '';
    if (locationString) {
        const parts = locationString.split(',').map(s => s.trim());
        city = text.includes("Remote") && !parts[0] ? '' : parts[0];
        state = parts.length > 1 ? parts[1] : '';
        country = parts.length > 2 ? parts[2] : 'USA'; 
    } else {
        locationString = 'Remote';
    }

    let postalCode = '';
    const postalCodeMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);
    if (postalCodeMatch) {
        postalCode = postalCodeMatch[0];
    } else {
        const ukCaMatch = text.match(/\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b|\b[A-Za-z]{1,2}\d[A-Za-z0-9]?\s?\d[A-Za-z]{2}\b/);
        if (ukCaMatch) {
            postalCode = ukCaMatch[0];
        }
    }

    // 2. Extract Phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
    let phone = '';
    if (phoneMatch) {
      const parsedPhone = parsePhoneNumberFromString(phoneMatch[0], 'IN') || parsePhoneNumberFromString(phoneMatch[0], 'US');
      phone = parsedPhone ? parsedPhone.formatInternational() : phoneMatch[0];
    }

    // 3. Extract Name
    // Heuristic: Use compromise to find people, or take the first few words if they look like a name
    let name = doc.people().first().text();
    if (!name) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines.slice(0, 5)) {
        if (line.split(' ').length <= 4 && /^[A-Z]/.test(line)) {
          name = line;
          break;
        }
      }
    }

    // 4. Links
    const linksMatch = text.match(/https?:\/\/[^\s]+/g) || [];
    const extractedLinks: { type: string, url: string }[] = [];
    const excluded = ['aistudio', 'googleusercontent', 'firebase', 'blob:', 'localhost', '.pdf', '.docx', 'resume'];

    let linkedin = '';
    let github = '';
    let portfolio = '';
    linksMatch.forEach(link => {
      if (excluded.some(ex => link.toLowerCase().includes(ex))) return;
      
      const url = link.toLowerCase();
      const isLinkedIn = /^(https?:\/\/)?(www\.)?linkedin\.com\//i.test(url);
      const isGitHub = /^(https?:\/\/)?(www\.)?github\.com\//i.test(url);

      if (isLinkedIn) {
        extractedLinks.push({ type: 'LinkedIn', url: link });
        linkedin = link;
      } else if (isGitHub) {
        extractedLinks.push({ type: 'GitHub', url: link });
        github = link;
      } else {
        extractedLinks.push({ type: 'Personal Website', url: link });
        if (!portfolio) portfolio = link;
      }
    });

    // 5. Sections
    const sections = this.extractSections(text);

    // 6. Total Experience
    const totalExperienceYears = this.calculateTotalExperience(sections.experience);

    // Heuristic Domain Extraction
    let domainFocus = 'Unknown Domain';
    const domainKeywords: Record<string, RegExp[]> = {
      'AI / Machine Learning': [/artificial intelligence/i, /machine learning/i, /deep learning/i, /neural network/i, /pytorch/i, /tensorflow/i, /nlp/i, /computer vision/i, /llm/i, /generative ai/i, /reinforcement learning/i],
      'IT / Software': [/software/i, /developer/i, /programmer/i, /engineer/i, /backend/i, /frontend/i, /fullstack/i, /cloud/i, /devops/i, /cybersecurity/i, /data science/i, /it consultant/i, /web development/i, /systems administrator/i],
      'Healthcare': [/doctor/i, /nurse/i, /medical/i, /healthcare/i, /clinician/i, /hospital/i, /pharmacy/i, /patient care/i, /pediatrician/i, /physician/i],
      'Finance': [/accounting/i, /finance/i, /audit/i, /banking/i, /investment/i, /ledger/i, /tax/i, /cpa/i, /fintech/i, /portfolio manager/i, /financial analyst/i],
      'Sales': [/sales/i, /account manager/i, /business development/i, /quota/i, /leads/i, /client acquisition/i, /account executive/i],
      'Marketing': [/marketing/i, /seo/i, /content strategy/i, /social media/i, /branding/i, /digital marketing/i, /advertising/i, /public relations/i],
      'HR': [/human resources/i, /talent acquisition/i, /recruitment/i, /payroll/i, /employee relations/i, /staffing/i, /hr generalist/i],
      'Operations': [/operations manager/i, /supply chain/i, /logistics/i, /operational/i, /process improvement/i, /operations analyst/i],
      'Engineering': [/mechanical/i, /civil/i, /electrical/i, /structural/i, /manufacturing/i, /industrial engineering/i, /chemical engineering/i, /hardware engineer/i],
      'Design': [/ui\/ux/i, /ux\b/i, /ui\b/i, /graphic design/i, /figma/i, /product designer/i, /photoshop/i, /illustrator/i, /creative direction/i, /web design/i],
      'Project Management': [/project manager/i, /project management/i, /scrum master/i, /agile/i, /pmp/i, /product manager/i, /program manager/i]
    };
    for (const [domain, patterns] of Object.entries(domainKeywords)) {
        if (patterns.some(p => p.test(text))) {
            domainFocus = domain;
            break;
        }
    }

    const skillsParsed = this.parseSkills(sections.skills, text);
    const allSkillsFlat = Array.from(new Set([
      ...(skillsParsed.languages || []),
      ...(skillsParsed.frameworks || []),
      ...(skillsParsed.databases || []),
      ...(skillsParsed.tools || []),
      ...(skillsParsed.libraries || []),
      ...(skillsParsed.other || [])
    ])).filter(Boolean);

    const skillsGrouped = [
      { category: 'Languages', items: skillsParsed.languages || [] },
      { category: 'Frameworks', items: skillsParsed.frameworks || [] },
      { category: 'Databases', items: skillsParsed.databases || [] },
      { category: 'Tools', items: skillsParsed.tools || [] },
      { category: 'Libraries', items: skillsParsed.libraries || [] },
      { category: 'Other', items: skillsParsed.other || [] }
    ].filter(g => g.items.length > 0);

    const expParsed = this.parseExperience(sections.experience);
    const workExperience = expParsed.map(e => ({
      job_title: e.title || '',
      company: e.company || '',
      location: 'Remote',
      start_date: e.duration ? e.duration.split('-')[0]?.trim() || '' : '',
      end_date: e.duration ? e.duration.split('-')[1]?.trim() || '' : '',
      duration: e.duration || '',
      is_current: e.duration ? /present|current|now|active/i.test(e.duration) : false,
      responsibilities: e.responsibilities || [],
      technologies: [],
      key_achievements: [],
      achievements: []
    }));

    const projParsed = this.parseProjects(sections.projects);
    const projects = projParsed.map(p => ({
      name: p.name || '',
      description: p.description ? p.description.join(' ') : '',
      technologies: p.technologies || [],
      role: '',
      live_url: p.links?.[0] || '',
      code_url: ''
    }));

    const keyProjects = projParsed.map(p => ({
      name: p.name || '',
      description: p.description ? p.description.join(' ') : '',
      tech_stack: p.technologies || [],
      live_url: p.links?.[0] || '',
      code_url: '',
      highlights: p.description || []
    }));

    const eduParsed = this.parseEducation(sections.education);
    const education = eduParsed.map(edu => ({
      degree: edu.degree || '',
      field_of_study: edu.field || '',
      institution: edu.institution || '',
      location: edu.location || '',
      start_date: '',
      end_date: edu.duration || '',
      start_year: '',
      end_year: edu.duration || '',
      grade: edu.gpa || '',
      gpa: edu.gpa || '',
      honors: ''
    }));

    const headline = workExperience[0]?.job_title || 'Software Professional';

    const data: ResumeData = {
      is_resume: true,
      parsing_confidence: 'medium',
      detected_language: 'en',
      contact: {
        full_name: name,
        email: email,
        mobile: phone,
        designation: headline,
        location: `${city}, ${country}`,
        address: `${city}, ${country}`
      },
      personal_info: {
        full_name: name,
        headline,
        email,
        phone,
        location: { city, state, country },
        links: {
          linkedin,
          github,
          portfolio,
          website: '',
          other: []
        }
      },
      links: {
        linkedin,
        github,
        portfolio,
        website: '',
        other_urls: []
      },
      professional_summary: sections.profile || '',
      total_experience_years: totalExperienceYears,
      career_level: 'Mid-Level',
      primary_role: headline,
      technical_skills: {
        languages: skillsParsed.languages || [],
        frontend: skillsParsed.frameworks || [],
        backend: skillsParsed.libraries || [],
        databases: skillsParsed.databases || [],
        cloud_devops: [],
        tools: skillsParsed.tools || [],
        cms_ecommerce: [],
        other: skillsParsed.other || []
      },
      skills: skillsGrouped,
      all_skills: allSkillsFlat,
      work_experience: workExperience,
      projects,
      key_projects: keyProjects,
      education,
      certifications: [],
      publications: [],
      volunteer: [],
      volunteering: [],
      interests: [],
      languages: this.parseList(sections.languages).map(lang => ({ language: lang, proficiency: 'Fluent' })),
      awards: this.parseList(sections.achievements),
      warnings: [],
      rawText: text
    };

    return ResumeSchema.parse(data);
  }

  private extractSections(text: string): Record<string, string> {
    const sectionHeaders: Record<string, RegExp[]> = {
      profile: [/\bSummary\b/i, /\bProfile\b/i, /\bObjective\b/i, /\bAbout Me\b/i],
      experience: [/\bExperience\b/i, /\bWork History\b/i, /\bEmployment\b/i, /\bProfessional Experience\b/i],
      education: [/\bEducation\b/i, /\bAcademic Background\b/i, /\bQualifications\b/i],
      projects: [/\bProjects\b/i, /\bPersonal Projects\b/i, /\bAcademic Projects\b/i],
      skills: [/\bSkills\b/i, /\bTechnologies\b/i, /\bTechnical Skills\b/i, /\bCore Competencies\b/i],
      achievements: [/\bAchievements\b/i, /\bHonors\b/i, /\bAwards\b/i],
      languages: [/\bLanguages\b/i],
      interests: [/\bInterests\b/i, /\bHobbies\b/i],
    };

    const lines = text.split('\n');
    const result: Record<string, string> = {
      profile: '', experience: '', education: '', projects: '', skills: '', achievements: '', languages: '', interests: ''
    };

    let currentSection = 'profile';
    lines.forEach(line => {
      let found = false;
      for (const [key, regexes] of Object.entries(sectionHeaders)) {
        if (regexes.some(r => r.test(line))) {
          currentSection = key;
          found = true;
          break;
        }
      }
      if (!found) {
        result[currentSection] += line + '\n';
      }
    });

    return result;
  }

  private parseExperience(text: string): any[] {
    const blocks = text.split(/\n(?=[A-Z0-9].*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}))/i);
    return blocks.filter(b => b.trim().length > 10).map(block => {
      const lines = block.trim().split('\n');
      const titleLine = lines[0];
      const durationMatch = block.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{2})?[\s\/-]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{2}|Present|Current)?(?:[\s\/-]*\d{2,4})?/i);
      
      const responsibilities = lines.slice(1).filter(l => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().length > 20);
      
      return {
        title: titleLine.split(/ at | - | \| /i)[0].trim(),
        company: (titleLine.split(/ at | - | \| /i)[1] || '').split(/[,(]/)[0].trim() || 'Software Company',
        duration: durationMatch ? durationMatch[0] : '',
        responsibilities: responsibilities.map(r => r.replace(/^[•-]\s*/, '').trim()),
      };
    });
  }

  private parseEducation(text: string): any[] {
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    return lines.map(line => {
      const yearMatch = line.match(/\d{4}/g);
      return {
        institution: line.split(/,|-|\|/)[0].trim(),
        degree: line.includes('Bachelor') ? 'Bachelor' : line.includes('Master') ? 'Master' : 'Degree',
        duration: yearMatch ? yearMatch.join(' - ') : '',
      };
    }).slice(0, 3);
  }

  private parseProjects(text: string): any[] {
    const blocks = text.split(/\n(?=[A-Z0-9])/).filter(b => b.trim().length > 10);
    return blocks.map(block => {
      const lines = block.trim().split('\n');
      return {
        name: lines[0].trim(),
        technologies: [],
        duration: '',
        description: lines.slice(1).filter(l => l.length > 10),
        links: [],
      };
    }).slice(0, 5);
  }

  private parseSkills(sectionText: string, fullText: string): any {
    const categories = {
      languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin'],
      frameworks: ['React', 'Angular', 'Vue', 'Next.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails'],
      databases: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'DynamoDB', 'SQLite'],
      tools: ['Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Terraform', 'Jira'],
      libraries: ['Redux', 'Tailwind', 'Styled Components', 'PandaCSS', 'Zod', 'PyTorch', 'TensorFlow', 'OpenCV'],
    };

    const found: any = { languages: [], frameworks: [], databases: [], tools: [], libraries: [], other: [] };

    // Search full text for predefined skills
    for (const [cat, list] of Object.entries(categories)) {
      list.forEach(skill => {
        const regex = new RegExp(`\\b${skill}\\b`, 'gi');
        if (regex.test(fullText)) {
          (found as any)[cat].push(skill);
        }
      });
    }

    // Extract other skills from section
    if (sectionText) {
      const manualItems = sectionText.split(/[,\n•|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 30);
      found.other = Array.from(new Set(manualItems)).slice(0, 15);
    }

    return found;
  }

  private parseList(text: string): string[] {
    return text.split(/[,\n•|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 100).slice(0, 10);
  }

  private calculateTotalExperience(expText: string): number {
    const dates = chrono.parse(expText);
    if (!dates.length) return 0;
    
    let totalMonths = 0;
    dates.forEach(d => {
      if (d.start && d.end) {
        const diff = d.end.date().getTime() - d.start.date().getTime();
        totalMonths += diff / (1000 * 60 * 60 * 24 * 30);
      } else if (d.start) {
        // If only start, assume it's a "from" and it's active? Or just a single point.
      }
    });

    return Math.round((totalMonths / 12) * 10) / 10;
  }
}
