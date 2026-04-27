import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set up worker for PDF.js using a reliable CDN path
// Hardcoding the version to match package.json to avoid issues with pdfjs.version
const PDFJS_VERSION = '4.10.38';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export interface ParsedResume {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  domain: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  links: Array<{
    label: string;
    url: string;
  }>;
}

export async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
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
    }

    if (!fullText.trim()) {
      console.warn('PDF extraction resulted in empty text. Possibly image-based PDF.');
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

export async function parseResumeHeuristically(text: string): Promise<ParsedResume> {
  const resume: ParsedResume = {
    fullName: '',
    email: '',
    phone: '',
    summary: '',
    domain: '',
    skills: [],
    experience: [],
    education: [],
    links: []
  };

  // 1. Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) resume.email = emailMatch[0];

  // 2. Extract Phone (Improved)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) resume.phone = phoneMatch[0];

  // 3. Extract Name (Heuristic refined: check first few lines for capitalized names)
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i];
        // Names are usually 2-3 words, capitalized, no weird symbols
        const nameRegex = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;
        if (nameRegex.test(line)) {
            resume.fullName = line;
            break;
        }
    }
    // Fallback if regex fails: search first 5 lines for short line with no tech keywords
    if (!resume.fullName) {
        const commonTech = ['resume', 'cv', 'email', 'phone', 'address', 'linkedin', 'github'];
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line.length > 2 && line.length < 30 && !commonTech.some(t => line.toLowerCase().includes(t)) && !line.includes('@')) {
                resume.fullName = line;
                break;
            }
        }
    }
  }

  // 4. Extract Links (LinkedIn, GitHub, Portfolio) - Aggressive Pattern
  const linkPatterns = [
    { label: 'LinkedIn', regex: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i },
    { label: 'GitHub', regex: /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i },
    { label: 'Behance', regex: /(?:https?:\/\/)?(?:www\.)?behance\.net\/[a-zA-Z0-9_-]+/i },
    { label: 'Dribbble', regex: /(?:https?:\/\/)?(?:www\.)?dribbble\.com\/[a-zA-Z0-9_-]+/i },
    { label: 'Generic', regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi }
  ];

  const foundLinksMap = new Map<string, string>();
  linkPatterns.forEach(pattern => {
    const matches = text.match(pattern.regex);
    if (matches) {
      matches.forEach(match => {
        let url = match.trim();
        if (!url.startsWith('http')) url = `https://${url}`;
        
        // Pick the best label
        let label = pattern.label;
        if (label === 'Generic') {
            if (url.includes('linkedin.com')) label = 'LinkedIn';
            else if (url.includes('github.com')) label = 'GitHub';
            else if (url.includes('portfolio') || url.includes('personal')) label = 'Portfolio';
            else label = 'Link';
        }
        
        if (!foundLinksMap.has(url)) {
          foundLinksMap.set(url, label);
        }
      });
    }
  });
  resume.links = Array.from(foundLinksMap.entries()).map(([url, label]) => ({ label, url }));

  // 5. Domain Extraction (Aggressive)
  const domainKeywords: Record<string, string[]> = {
    'Software Engineering': ['developer', 'software', 'engineer', 'frontend', 'backend', 'fullstack', 'coder', 'web', 'javascript', 'python', 'java', 'react', 'c++', 'c#', 'node', 'express', 'devops', 'cloud', 'architecture'],
    'Data Science': ['data', 'scientist', 'analysis', 'analytics', 'machine learning', 'ai', 'statistical', 'modeling', 'sql', 'big data', 'pandas', 'numpy', 'tensorflow', 'pytorch'],
    'Marketing': ['marketing', 'brand', 'advertising', 'social media', 'content', 'seo', 'sem', 'campaign', 'growth', 'copywriter', 'pr', 'communications'],
    'Sales': ['sales', 'account executive', 'business development', 'revenue', 'prospecting', 'lead generation', 'closing', 'saas sales'],
    'Human Resources': ['hr', 'recruiter', 'recruiting', 'talent', 'human resources', 'compensation', 'benefits', 'compliance', 'sourcing', 'onboarding'],
    'Product Management': ['product manager', 'product owner', 'product design', 'strategy', 'roadmap', 'agile', 'scrum', 'user stories', 'backlog'],
    'Design': ['designer', 'ui', 'ux', 'product designer', 'graphic designer', 'illustrator', 'creative', 'adobe', 'figma', 'sketch', 'canva', 'prototyping'],
    'Finance': ['finance', 'accountant', 'accounting', 'banking', 'investment', 'ledger', 'audit', 'tax', 'financial analyst', 'treasury', 'cpa'],
    'Operations': ['operations', 'supply chain', 'admin', 'coordinator', 'logistics', 'process', 'project management', 'workflow'],
    'Legal': ['legal', 'lawyer', 'attorney', 'paralegal', 'compliance', 'counsel', 'contract', 'litigation', 'corporate law'],
    'Customer Support': ['customer support', 'customer success', 'help desk', 'ticketing', 'service', 'support agent', 'client relations'],
    'Engineering (Physical)': ['civil engineer', 'mechanical engineer', 'electrical engineer', 'structural', 'cad', 'blueprints', 'construction', 'manufacturing']
  };

  const domainScores: Record<string, number> = {};
  Object.entries(domainKeywords).forEach(([dom, kws]) => {
    domainScores[dom] = 0;
    kws.forEach(kw => {
      // Escape special characters for regex
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use boundary-aware regex that handles symbols like C++
      const regex = new RegExp(`(^|[^a-zA-Z0-9#+.])${escapedKw}([^a-zA-Z0-9#+.]|$)`, 'gi');
      const matches = text.match(regex);
      if (matches) domainScores[dom] += matches.length;
    });
  });

  const bestDomain = Object.entries(domainScores).reduce((a, b) => b[1] > a[1] ? b : a, ['General', 0]);
  resume.domain = bestDomain[1] > 0 ? bestDomain[0] : 'General';

  // 6. Skills Extraction (Keywords based)
  const commonSkills = [
    'React', 'Javascript', 'Typescript', 'Python', 'Java', 'C++', 'C#', 'Node.js', 
    'Express', 'React Native', 'Swift', 'Kotlin', 'AWS', 'Docker', 'Kubernetes',
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Redux', 'Tailwind', 'Git',
    'Project Management', 'Agile', 'Scrum', 'Sales', 'Marketing', 'Customer Service',
    'HTML', 'CSS', 'Vue', 'Angular', 'Next.js', 'Firebase', 'GraphQL', 'REST',
    'Figma', 'UI Design', 'UX Design', 'Data Analysis', 'Tableau', 'Power BI',
    'Machine Learning', 'AI', 'NLP', 'Computer Vision', 'Deep Learning',
    'Financial Modeling', 'Budgeting', 'Account Management', 'CRM', 'Salesforce',
    'Public Speaking', 'Leadership', 'Team Management', 'Strategy', 'Negotiation',
    'SEO', 'SEM', 'Content Strategy', 'Social Media', 'Branding', 'Copywriting',
    'Adobe Creative Suite', 'Photoshop', 'Illustrator', 'InDesign', 'Premiere Pro',
    'AutoCAD', 'SolidWorks', 'MATLAB', 'R', 'Scala', 'Go', 'Rust', 'PHP', 'Laravel',
    'Azure', 'GCP', 'Jenkins', 'Terraform', 'Ansible', 'Linux', 'Security', 'Cybersecurity'
  ];
  
  const foundSkills = new Set<string>();
  commonSkills.forEach(skill => {
    // Escape special regex characters like + in C++ or . in Node.js
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // For technical skills like C++, standard \b boundary doesn't work well 
    // because + is not a word character. We use positive lookahead/lookbehind 
    // or simply check if it's flanked by non-word chars or start/end of string.
    const regex = new RegExp(`(^|[^a-zA-Z0-9#+.])${escapedSkill}([^a-zA-Z0-9#+.]|$)`, 'gi');
    
    if (regex.test(text)) {
      foundSkills.add(skill);
    }
  });
  resume.skills = Array.from(foundSkills);

  // 7. Section based extraction (Refined)
  const sections: Record<string, RegExp[]> = {
    summary: [/\bSummary\b/i, /\bProfile\b/i, /\bObjective\b/i, /\bAbout Me\b/i, /\bProfessional Bio\b/i],
    experience: [/\bExperience\b/i, /\bWork History\b/i, /\bEmployment\b/i, /\bProfessional Background\b/i, /\bCareer Summary\b/i, /\bWork Experience\b/i],
    education: [/\bEducation\b/i, /\bAcademic\b/i, /\bQualifications\b/i, /\bSchooling\b/i, /\bCertifications\b/i, /\bAcademic Background\b/i],
    skills: [/\bSkills\b/i, /\bCompetencies\b/i, /\bTechnologies\b/i, /\bTechnical Skills\b/i, /\bExpertise\b/i, /\bCore Skills\b/i]
  };

  const textLower = text.toLowerCase();
  
  // Helper to get text between two headers (Case-insensitive search but returns original text)
  const getSectionText = (sectionKey: string): string => {
    const sectionRegexes = sections[sectionKey];
    let startIndex = -1;

    for (const regex of sectionRegexes) {
      const match = text.match(regex);
      if (match && match.index !== undefined) {
        // Ensure it looks like a header (often on its own line or start of line)
        const around = text.substring(Math.max(0, match.index - 2), match.index + match[0].length + 2);
        startIndex = match.index + match[0].length;
        break;
      }
    }

    if (startIndex === -1) return '';

    // Find next header to stop at
    let endIndex = text.length;
    for (const key in sections) {
      for (const regex of sections[key]) {
        const subText = text.substring(startIndex);
        const match = subText.match(regex);
        if (match && match.index !== undefined) {
          const absoluteIndex = startIndex + match.index;
          if (absoluteIndex < endIndex && absoluteIndex > startIndex) {
            // Check if it's likely a header (start of a line usually)
            const prevChar = text[absoluteIndex - 1];
            if (!prevChar || prevChar === '\n' || prevChar === '\r') {
               endIndex = absoluteIndex;
            }
          }
        }
      }
    }

    return text.substring(startIndex, endIndex).trim();
  };

  const summaryRaw = getSectionText('summary');
  resume.summary = summaryRaw.split(/\r?\n/).filter(line => line.length > 15).slice(0, 3).join(' ') || summaryRaw.substring(0, 500);
  
  const eduText = getSectionText('education');
  if (eduText) {
    const eduEntries = eduText.split(/\r?\n(?=[A-Z])/).filter(e => e.trim().length > 10);
    resume.education = eduEntries.slice(0, 4).map(entry => {
      const entryLines = entry.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const mainLine = entryLines[0] || '';
      
      // Look for degree keywords more intelligently
      const degreeMatch = entry.match(/(?:Bachelor|Master|B\.S\.|M\.S\.|B\.A\.|M\.A\.|Ph\.D\.|High School|Diploma|Associate|Degree|BSc|MSc)\b.*?$/i);
      const degree = degreeMatch ? degreeMatch[0].split(/[,|]/)[0].trim() : mainLine;
      
      const year = entry.match(/\b(19|20)\d{2}\b/)?.[0] || 'N/A';
      
      return {
        degree,
        school: entryLines.find(l => l !== mainLine && l.length > 5) || mainLine,
        year
      };
    });
  }

  const expText = getSectionText('experience');
  if (expText) {
    // Advanced experience splitting: 
    // Look for lines starting with capitalized words (Company/Role) OR lines preceded by dates
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0|1][0-9])?[\/\s-]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0|1][0-9]|Present|Current)?(?:[\/\s-]*\d{2,4})?/gi;
    
    // Split by lines that look like headers or contain dates
    const entries = expText.split(/\r?\n(?=[A-Z][a-zA-Z\s,]{3,}(?:at|for|\||-|–|—))|(?:\r?\n(?=\d{4}\s*[-–]))/).filter(e => e.trim().length > 15);
    
    resume.experience = (entries.length > 1 ? entries : expText.split(/\n\s*[•\-*]\s*/).filter(e => e.trim().length > 15)).slice(0, 6).map(entry => {
      const entryLines = entry.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const titleLine = entryLines[0] || '';
      
      const foundDates = entry.match(dateRegex);
      const duration = foundDates ? foundDates[0] : 'N/A';

      let role = 'Professional Role';
      let company = 'Organization';
      
      const titleSeparators = [/\|/, / at /i, / for /i, / - / , / – / , / — / , / , /];
      for (const sep of titleSeparators) {
        const parts = titleLine.split(sep);
        if (parts.length >= 2) {
            role = parts[0].trim();
            company = parts[1].split(/[,(]/)[0].trim();
            break;
        }
      }

      if (role === 'Professional Role' && titleLine) role = titleLine;

      return {
        role,
        company,
        duration,
        description: entryLines.slice(1, 6).join(' ').substring(0, 500)
      };
    });
  }

  const skillText = getSectionText('skills');
  if (skillText && resume.skills.length === 0) {
    resume.skills = skillText.split(/[,\n•]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30).slice(0, 15);
  }

  return resume;
}
