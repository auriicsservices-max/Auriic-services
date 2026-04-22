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
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
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
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) resume.email = emailMatch[0];

  // 2. Extract Phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) resume.phone = phoneMatch[0];

  // 3. Extract Name (Heuristic: usually the first non-empty line)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    // Basic filter to avoid taking contact info as name if it's first
    const firstLine = lines[0];
    if (!firstLine.includes('@') && !firstLine.match(/\d{4,}/)) {
      resume.fullName = firstLine;
    }
  }

  // 4. Skills Extraction (Keywords based)
  const commonSkills = [
    'React', 'Javascript', 'Typescript', 'Python', 'Java', 'C++', 'C#', 'Node.js', 
    'Express', 'React Native', 'Swift', 'Kotlin', 'AWS', 'Docker', 'Kubernetes',
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Redux', 'Tailwind', 'Git',
    'Project Management', 'Agile', 'Scrum', 'Sales', 'Marketing', 'Customer Service'
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

  // 5. Section based extraction (Refined)
  const sections: Record<string, RegExp[]> = {
    summary: [/summary/i, /professional bio/i, /about me/i, /profile/i],
    experience: [/experience/i, /work history/i, /employment/i, /professional background/i],
    education: [/education/i, /academic/i, /qualifications/i, /schooling/i],
    skills: [/skills/i, /competencies/i, /technologies/i, /technical skills/i]
  };

  const textLower = text.toLowerCase();
  
  // Helper to get text between two headers
  const getSectionText = (sectionKey: string): string => {
    const sectionRegexes = sections[sectionKey];
    let startIndex = -1;
    let foundRegex: RegExp | null = null;

    for (const regex of sectionRegexes) {
      const match = text.match(regex);
      if (match && match.index !== undefined) {
        startIndex = match.index + match[0].length;
        foundRegex = regex;
        break;
      }
    }

    if (startIndex === -1) return '';

    // Find next header to stop at
    let endIndex = text.length;
    for (const key in sections) {
      if (key === sectionKey) continue;
      for (const regex of sections[key]) {
        const match = text.substring(startIndex).match(regex);
        if (match && match.index !== undefined) {
          const absoluteIndex = startIndex + match.index;
          if (absoluteIndex < endIndex) {
            endIndex = absoluteIndex;
          }
        }
      }
    }

    return text.substring(startIndex, endIndex).trim();
  };

  resume.summary = getSectionText('summary').split('\n').slice(0, 5).join(' ');
  
  const eduText = getSectionText('education');
  if (eduText) {
    const eduLines = eduText.split('\n').filter(l => l.trim().length > 5);
    resume.education = eduLines.slice(0, 3).map(line => ({
      degree: line.split(',')[0] || line,
      school: line.split(',')[1] || 'University',
      year: line.match(/\d{4}/)?.[0] || 'N/A'
    }));
  }

  const expText = getSectionText('experience');
  if (expText) {
    const expLines = expText.split('\n').filter(l => l.trim().length > 10);
    resume.experience = expLines.slice(0, 3).map(line => ({
      role: line.split(/at|for|-/i)[0]?.trim() || 'Role',
      company: line.split(/at|for|-/i)[1]?.trim() || 'Company',
      duration: line.match(/\d{4}/)?.[0] || 'N/A',
      description: line
    }));
  }

  const skillText = getSectionText('skills');
  if (skillText && resume.skills.length === 0) {
    resume.skills = skillText.split(/[,\n•]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30).slice(0, 15);
  }

  return resume;
}
