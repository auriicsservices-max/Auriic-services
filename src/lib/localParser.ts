import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { ResumeData } from '../types/resume';
import { analyzeSkillsFromText } from './skillsChecker';

export type ParsedResume = ResumeData;

// Set up worker for PDF.js using a reliable CDN path
const PDFJS_VERSION = '4.10.38';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

// Step 1: File Reading / Text Extraction Pipeline
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer, onProgress?: (progress: number) => void): Promise<string> {
  console.log('Starting PDF extraction...', pdfBuffer.byteLength);
  try {
    const loadingTask = pdfjs.getDocument({ 
      data: pdfBuffer,
      useWorkerFetch: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Sort items by Y coordinate (descending) then X (ascending)
      const items = textContent.items as any[];
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) < 5) { // Same line if within 5 units
          return a.transform[4] - b.transform[4];
        }
        return yDiff;
      });

      let pageText = '';
      let lastY = -1;
      for (const item of items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      fullText += pageText + '\n';
      
      if (onProgress) {
        onProgress(Math.round((i / pdf.numPages) * 100));
      }
    }

    if (!fullText.trim()) {
      console.warn('PDF extraction resulted in empty text. Image-based or protected PDF.');
    }

    return fullText;
  } catch (error) {
    console.error('Error during PDF text extraction:', error);
    throw new Error(`PDF Extraction Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function extractTextFromDocx(docxBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
  return result.value;
}

// Step 2: Section Splitting (section_finder logic)
interface SectionMap {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certifications: string;
  publications: string;
  volunteer: string;
  interests: string;
  awards: string;
  languages: string;
}

const SECTION_HEADERS: Record<keyof SectionMap, RegExp[]> = {
  summary: [
    /^(summary|profile|objective|about\s*me|executive\s*summary|professional\s*summary)$/i,
    /\b(summary|profile|about\s*me)\b/i
  ],
  experience: [
    /^(experience|work\s*history|employment|professional\s*experience|career\s*history|work\s*experience)$/i,
    /\b(work\s*experience|employment\s*history|experience)\b/i
  ],
  education: [
    /^(education|academic\s*background|qualifications|academic\s*history|education\s*&\s*credentials)$/i,
    /\b(education|academic\s*background)\b/i
  ],
  skills: [
    /^(skills|technologies|technical\s*skills|core\s*competencies|areas\s*of\s*expertise|tools\s*&\s*tech|skills\s*&\s*tools)$/i,
    /\b(technical\s*skills|core\s*competencies|skills)\b/i
  ],
  projects: [
    /^(projects|personal\s*projects|key\s*projects|academic\s*projects|selected\s*projects)$/i,
    /\b(projects|key\s*projects)\b/i
  ],
  certifications: [
    /^(certifications|certificates|licenses|credentials|professional\s*certifications)$/i,
    /\b(certifications|certificates|licenses)\b/i
  ],
  publications: [
    /^(publications|research|papers|articles|patents)$/i,
    /\b(publications|research\s*papers)\b/i
  ],
  volunteer: [
    /^(volunteer|volunteering|community\s*involvement|social\s*work|leadership)$/i,
    /\b(volunteer\s*experience|community\s*service)\b/i
  ],
  interests: [
    /^(interests|hobbies|activities|personal\s*interests|extracurriculars)$/i,
    /\b(interests\s*&\s*hobbies|personal\s*interests)\b/i
  ],
  awards: [
    /^(awards|honors|achievements|recognitions|awards\s*&\s*honors)$/i,
    /\b(awards\s*&\s*honors|achievements)\b/i
  ],
  languages: [
    /^(languages|spoken\s*languages|language\s*proficiency)$/i,
    /\b(languages)\b/i
  ]
};

function splitSections(text: string): SectionMap {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const sections: SectionMap = {
    summary: '',
    experience: '',
    education: '',
    skills: '',
    projects: '',
    certifications: '',
    publications: '',
    volunteer: '',
    interests: '',
    awards: '',
    languages: ''
  };

  interface DetectedHeader {
    index: number;
    sectionKey: keyof SectionMap;
  }

  const detected: DetectedHeader[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length > 50) continue;

    // Check standalone exact match first
    let matchedKey: keyof SectionMap | null = null;
    for (const [key, regexes] of Object.entries(SECTION_HEADERS)) {
      if (regexes[0].test(line)) {
        matchedKey = key as keyof SectionMap;
        break;
      }
    }

    // Fallback to inline regex if not matched
    if (!matchedKey) {
      for (const [key, regexes] of Object.entries(SECTION_HEADERS)) {
        if (regexes[1].test(line) && line.length < 35) {
          matchedKey = key as keyof SectionMap;
          break;
        }
      }
    }

    if (matchedKey) {
      detected.push({ index: i, sectionKey: matchedKey });
    }
  }

  // Extract content slice between detected section headers
  for (let d = 0; d < detected.length; d++) {
    const start = detected[d].index + 1;
    const end = d + 1 < detected.length ? detected[d + 1].index : lines.length;
    const sectionLines = lines.slice(start, end);
    sections[detected[d].sectionKey] += sectionLines.join('\n') + '\n';
  }

  return sections;
}

// Step 3: Extractors (Contact, Summary, Experience [4 patterns], Education [block-split])

// Contact Extractor
function extractContact(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  // EMAIL
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0] : '';

  // PHONE
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // LINKEDIN
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i);
  const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '';

  // GITHUB
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/?/i);
  const github = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : '';

  // OTHER LINKS
  const linkRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const allLinks = text.match(linkRegex) || [];
  let portfolio = '';
  let website = '';
  const otherLinks: string[] = [];

  allLinks.forEach(url => {
    const l = url.toLowerCase();
    if (!l.includes('linkedin.com') && !l.includes('github.com') && !l.includes('w3.org') && !l.includes('schema.org')) {
      if (!portfolio) portfolio = url;
      else if (!website) website = url;
      else otherLinks.push(url);
    }
  });

  // NAME
  let fullName = '';
  const ignoreWords = ['cv', 'resume', 'curriculum', 'profile', 'summary', 'contact', 'email', 'phone', 'address', 'page'];
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.length > 40 || line.includes('@') || line.includes('http') || /\d/.test(line)) continue;
    if (ignoreWords.some(w => line.toLowerCase().includes(w))) continue;

    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w))) {
      fullName = line;
      break;
    }
  }

  if (!fullName) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length > 3 && line.length < 35 && !line.includes('@') && !line.includes(':') && !/\d/.test(line)) {
        fullName = line;
        break;
      }
    }
  }

  // LOCATION
  let city = '';
  let state = '';
  let country = '';

  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const match = lines[i].match(/([A-Za-z\s]+),\s*([A-Za-z\s]{2,})(?:\s+([\d\w-]+))?/);
    if (match && match[1].length < 35 && match[2].length < 25) {
      city = match[1].trim();
      state = match[2].trim();
      country = 'USA';
      break;
    }
  }

  return {
    fullName,
    email,
    phone,
    location: { city, state, country },
    links: { linkedin, github, portfolio, website, other: otherLinks }
  };
}

// Experience Extractor (with 4 regex patterns in priority order)
function extractExperience(expText: string) {
  if (!expText.trim()) return [];

  const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9])?[\/\s-]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9]|Present|Current)?(?:[\/\s-]*\d{2,4})?/i;
  const blocks = expText.split(/\n\s*\n/).filter(b => b.trim().length > 15);

  const workHistory: any[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    let job_title = 'Professional Role';
    let company = 'Organization';
    let location = 'Remote';
    let startDate = '';
    let endDate = '';
    let isCurrent = false;

    const fullBlockStr = lines.join(' ');
    const dateMatch = fullBlockStr.match(datePattern);
    const durationStr = dateMatch ? dateMatch[0] : '';

    if (durationStr) {
      const parts = durationStr.split(/[-–—to]+/i);
      startDate = parts[0]?.trim() || '';
      endDate = parts[1]?.trim() || '';
      isCurrent = /present|current|now/i.test(endDate || durationStr);
    }

    let parsedHeader = false;

    // Pattern 1: Pipe / Bar separated 4 parts (Title | Company | Location | Dates)
    for (const l of lines.slice(0, 3)) {
      if (l.includes('|')) {
        const parts = l.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          job_title = parts[0];
          company = parts[1];
          location = parts[2];
          parsedHeader = true;
          break;
        } else if (parts.length === 3) {
          // Pattern 2: Pipe / Bar separated 3 parts (Title | Company | Dates)
          job_title = parts[0];
          company = parts[1];
          if (!datePattern.test(parts[2])) {
            location = parts[2];
          }
          parsedHeader = true;
          break;
        }
      }
    }

    // Pattern 3: Stacked lines (Line 1: Title, Line 2: Company, Line 3: Dates/Location)
    if (!parsedHeader && lines.length >= 2) {
      const line1 = lines[0];
      const line2 = lines[1];

      if (line1.includes(' at ')) {
        const p = line1.split(/ at /i);
        job_title = p[0].trim();
        company = p[1].trim();
        parsedHeader = true;
      } else if (line1.includes(' - ')) {
        const p = line1.split(' - ');
        job_title = p[0].trim();
        company = p[1].trim();
        parsedHeader = true;
      } else {
        job_title = line1;
        company = line2.replace(datePattern, '').trim() || 'Company';
        parsedHeader = true;
      }
    }

    // Responsibilities and Key Achievements extraction
    const responsibilities: string[] = [];
    const keyAchievements: string[] = [];

    for (const l of lines.slice(1)) {
      if (l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.length > 20) {
        const cleanLine = l.replace(/^[•\-\*]\s*/, '').trim();
        responsibilities.push(cleanLine);

        // Achievement metric detection (e.g. %, $, numbers, or metric action verbs)
        if (/\b(\d+%\b|\$\d+|\b(increased|reduced|improved|managed|led|architected|saved|generated|grew|scaled|achieved)\b)/i.test(cleanLine)) {
          keyAchievements.push(cleanLine);
        }
      }
    }

    workHistory.push({
      company: company || 'Company',
      job_title: job_title || 'Role',
      location: location || 'Remote',
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
      responsibilities: responsibilities.slice(0, 15),
      technologies: [],
      key_achievements: keyAchievements.slice(0, 5)
    });
  }

  return workHistory;
}

// Education Extractor (splits on blank lines, 1 block = 1 school/degree)
function extractEducation(eduText: string, fullText: string = '') {
  const textToScan = eduText.trim() ? eduText : fullText;
  if (!textToScan.trim()) return [];

  const blocks = textToScan.split(/\n\s*\n/).filter(b => b.trim().length > 10);
  const educationList: any[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    const fullStr = lines.join(' ');
    // Filter out blocks that are clearly experience or skills when scanning fullText
    if (!eduText.trim() && !/bachelor|master|ph\.?d|b\.tech|b\.e|m\.tech|degree|diploma|university|college|institute|cbse|icse/i.test(fullStr)) {
      continue;
    }

    const yearMatch = fullStr.match(/\b(19|20)\d{2}\b/g) || [];
    const startDate = yearMatch[0] || '';
    const endDate = yearMatch[1] || yearMatch[0] || '';

    // Degree detection
    let degree = 'Degree';
    if (/bachelor|b\.s|b\.a|b\.tech|b\.e|b\.sc|b\.com|bba|bca/i.test(fullStr)) degree = 'Bachelor';
    else if (/master|m\.s|m\.a|m\.tech|m\.e|m\.sc|m\.com|mba|mca/i.test(fullStr)) degree = 'Master';
    else if (/ph\.?d|doctorate/i.test(fullStr)) degree = 'PhD';
    else if (/associate/i.test(fullStr)) degree = 'Associate';
    else if (/diploma/i.test(fullStr)) degree = 'Diploma';
    else if (/high\s*school|secondary|cbse|icse/i.test(fullStr)) degree = 'High School';

    // Institution & Field
    const parts = lines[0].split(/,|-|\|/);
    const institution = parts[0]?.trim() || 'Institution';
    const field_of_study = parts[1]?.trim() || (lines[1] ? lines[1] : '');

    // Board detection
    const boardMatch = fullStr.match(/\b(cbse|icse|state\s*board|autonomous|cambridge|igcse)\b/i);
    const board = boardMatch ? boardMatch[0].toUpperCase() : '';

    // Grade / GPA detection
    const gpaMatch = fullStr.match(/\b(?:gpa|grade|cgpa|percentage)\s*:?\s*([\d\.]+(?:\/[\d\.]+|%)?)/i) || fullStr.match(/\b(\d{1,2}\.\d{1,2}\/10|\d{2}%|\d\.\d{1,2}\/4\.0)\b/i);
    const grade = gpaMatch ? gpaMatch[0] : '';

    educationList.push({
      institution,
      degree,
      field_of_study,
      course: field_of_study,
      specialization: '',
      board,
      location: '',
      start_date: startDate,
      end_date: endDate,
      grade,
      gpa: grade,
      certifications: []
    });
  }

  return educationList;
}

// Main Heuristic Parser Engine
export async function parseResumeHeuristically(text: string): Promise<ParsedResume> {
  const sections = splitSections(text);
  const contact = extractContact(text);
  const experience = extractExperience(sections.experience || text);
  const education = extractEducation(sections.education, text);

  // Unlabeled summary fallback
  let summaryText = sections.summary.trim();
  if (!summaryText || summaryText.length < 20) {
    const topLines = text.split('\n').slice(0, 20);
    for (const l of topLines) {
      const trimmed = l.trim();
      if (
        trimmed.length > 45 &&
        !trimmed.includes('@') &&
        !/phone|tel|\+\d+|linkedin|github|http/i.test(trimmed) &&
        !/\b(experience|education|skills|projects)\b/i.test(trimmed)
      ) {
        summaryText = trimmed;
        break;
      }
    }
  }

  // Skills Analysis via Step 4 Skills Checker Engine
  const skillAnalysis = analyzeSkillsFromText(text);
  const allSkillsList: string[] = [];
  const categorizedSkills: any[] = [];

  for (const cat of skillAnalysis) {
    if (cat.found.length > 0) {
      allSkillsList.push(...cat.found);
      categorizedSkills.push({
        category: cat.category,
        items: cat.found
      });
    }
  }

  // Projects Extraction
  const projectsList: any[] = [];
  if (sections.projects.trim()) {
    const projBlocks = sections.projects.split(/\n\s*\n/).filter(b => b.trim().length > 15);
    projBlocks.slice(0, 5).forEach(block => {
      const pLines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (pLines.length > 0) {
        projectsList.push({
          name: pLines[0] || 'Project',
          description: pLines.slice(1).join(' ') || pLines[0],
          technologies: [],
          role: '',
          live_url: pLines.find(l => l.startsWith('http')) || null,
          code_url: null
        });
      }
    });
  }

  // Certifications Extraction
  const certList: any[] = [];
  if (sections.certifications.trim()) {
    const cLines = sections.certifications.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    cLines.slice(0, 10).forEach(c => {
      certList.push({
        name: c,
        issuer: '',
        year: ''
      });
    });
  }

  const headline = experience[0]?.job_title || 'Software Professional';
  const fullName = contact.fullName || 'Candidate';
  const email = contact.email || '';
  const phone = contact.phone || '';
  const locationStr = contact.location ? `${contact.location.city}, ${contact.location.country}` : '';

  const workExperienceNormalized = experience.map(exp => ({
    job_title: exp.job_title || '',
    company: exp.company || '',
    location: exp.location || '',
    start_date: exp.start_date || '',
    end_date: exp.end_date || '',
    duration: exp.start_date ? `${exp.start_date} - ${exp.is_current ? 'Present' : (exp.end_date || 'Present')}` : (exp.end_date || ''),
    is_current: exp.is_current || false,
    responsibilities: exp.responsibilities || [],
    technologies: exp.technologies || [],
    key_achievements: [],
    achievements: []
  }));

  const educationNormalized = education.map(edu => ({
    degree: edu.degree || '',
    field_of_study: edu.field_of_study || edu.course || '',
    course: edu.course || edu.field_of_study || '',
    specialization: edu.specialization || '',
    institution: edu.institution || '',
    board: edu.board || '',
    location: edu.location || '',
    duration: edu.start_date ? `${edu.start_date} - ${edu.end_date || 'Present'}` : (edu.end_date || ''),
    start_date: edu.start_date || '',
    end_date: edu.end_date || '',
    start_year: edu.start_date || '',
    end_year: edu.end_date || '',
    grade: edu.grade || edu.gpa || '',
    gpa: edu.gpa || edu.grade || '',
    honors: '',
    certifications: edu.certifications || []
  }));

  const eduConfidence = educationNormalized.length > 0 ? 'high' : 'low';
  const sumConfidence = summaryText.length > 20 ? 'high' : 'low';
  const reviewReasons: string[] = [];
  if (educationNormalized.length === 0) reviewReasons.push('Education section missing or incomplete');
  if (!summaryText) reviewReasons.push('Professional summary missing');

  const needsReview = educationNormalized.length === 0 || !summaryText;

  const projectsNormalized = projectsList.map(p => ({
    name: p.name || '',
    description: p.description || '',
    technologies: p.technologies || [],
    role: p.role || '',
    live_url: p.live_url || '',
    code_url: p.code_url || ''
  }));

  const keyProjectsNormalized = projectsList.map(p => ({
    name: p.name || '',
    description: p.description || '',
    tech_stack: p.technologies || [],
    live_url: p.live_url || '',
    code_url: p.code_url || '',
    highlights: p.description ? [p.description] : []
  }));

  const resume: ParsedResume = {
    is_resume: true,
    parsing_confidence: needsReview ? 'medium' : 'high',
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
      location: contact.location,
      links: contact.links
    },
    links: {
      linkedin: contact.links?.linkedin || '',
      github: contact.links?.github || '',
      portfolio: contact.links?.portfolio || '',
      website: contact.links?.website || '',
      other_urls: contact.links?.other || []
    },
    professional_summary: summaryText,
    education_confidence: eduConfidence,
    summary_confidence: sumConfidence,
    needs_review: needsReview,
    review_reasons: reviewReasons,
    total_experience_years: experience.length > 0 ? Math.max(1, experience.length * 2) : 0,
    career_level: 'Mid-Level',
    primary_role: headline,
    technical_skills: {
      languages: categorizedSkills.find(s => s.category.toLowerCase() === 'languages')?.items || [],
      frontend: categorizedSkills.find(s => s.category.toLowerCase() === 'frameworks' || s.category.toLowerCase() === 'frontend')?.items || [],
      backend: categorizedSkills.find(s => s.category.toLowerCase() === 'backend')?.items || [],
      databases: categorizedSkills.find(s => s.category.toLowerCase() === 'databases')?.items || [],
      cloud_devops: categorizedSkills.find(s => s.category.toLowerCase() === 'cloud' || s.category.toLowerCase() === 'devops')?.items || [],
      tools: categorizedSkills.find(s => s.category.toLowerCase() === 'tools')?.items || [],
      cms_ecommerce: [],
      other: categorizedSkills.find(s => !['languages', 'frameworks', 'frontend', 'backend', 'databases', 'cloud', 'devops', 'tools'].includes(s.category.toLowerCase()))?.items || []
    },
    skills: categorizedSkills,
    all_skills: Array.from(new Set(allSkillsList)),
    work_experience: workExperienceNormalized,
    projects: projectsNormalized,
    key_projects: keyProjectsNormalized,
    education: educationNormalized,
    certifications: certList,
    publications: [],
    volunteer: [],
    volunteering: [],
    interests: [],
    languages: [],
    awards: [],
    warnings: [],
    rawText: text
  };

  return resume;
}
