import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set up worker for PDF.js using a reliable CDN path
// Hardcoding the version to match package.json to avoid issues with pdfjs.version
const PDFJS_VERSION = '4.10.38';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

import { ResumeData } from '../types/resume';
export type ParsedResume = ResumeData;

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
    is_resume: true,
    parsing_confidence: 'low',
    detected_language: 'en',
    personal_info: {
      full_name: '',
      headline: '',
      email: '',
      phone: '',
      location: {
        city: '',
        state: '',
        country: ''
      },
      links: {
        linkedin: '',
        github: '',
        portfolio: '',
        website: '',
        other: []
      }
    },
    professional_summary: '',
    total_experience_years: 0,
    skills: [],
    all_skills: [],
    work_experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
    awards: [],
    warnings: [],
    rawText: text
  };

  // 1. Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) resume.personal_info.email = emailMatch[0];

  // 2. Extract Phone
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) resume.personal_info.phone = phoneMatch[0];

  // 3. Extract Name
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Location heuristic
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];
    const match = line.match(/([A-Za-z\s]+),\s*([A-Za-z\s]{2,})(?:\s+([\d\w-]+))?/);
    if (match && match[1].length < 40 && match[2].length < 30) {
        resume.personal_info.location.city = match[1].trim();
        resume.personal_info.location.state = match[2].trim();
        resume.personal_info.location.country = 'USA'; 
        break;
    }
  }

  if (lines.length > 0) {
    const commonTitles = ['cv', 'resume', 'curriculum', 'profile', 'summary', 'address', 'page', 'email', 'phone'];
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        if (line.length > 40 || line.includes('@') || line.includes('http') || /\d/.test(line)) continue;
        if (commonTitles.some(t => line.toLowerCase().includes(t))) continue;

        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w))) {
            resume.personal_info.full_name = line;
            break;
        }
    }
    
    if (!resume.personal_info.full_name) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line.length > 3 && line.length < 35 && !line.includes('@') && !line.includes(':')) {
                resume.personal_info.full_name = line;
                break;
            }
        }
    }
  }

  // 4. Extract Links
  const linkRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const matches = text.match(linkRegex) || [];
  
  matches.forEach(url => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('linkedin.com/')) {
      resume.personal_info.links.linkedin = url;
    } else if (lowerUrl.includes('github.com/')) {
      resume.personal_info.links.github = url;
    } else if (!lowerUrl.includes('google') && !lowerUrl.includes('mozilla') && !lowerUrl.includes('w3.org')) {
      if (!resume.personal_info.links.portfolio) {
        resume.personal_info.links.portfolio = url;
      } else {
        resume.personal_info.links.other.push(url);
      }
    }
  });

  // Helper to find sections
  const getSectionContent = (sectionType: string): string => {
    const headers: Record<string, RegExp[]> = {
      profile: [/\bSummary\b/i, /\bProfile\b/i, /\bObjective\b/i, /\bAbout Me\b/i],
      experience: [/\bExperience\b/i, /\bWork History\b/i, /\bEmployment\b/i, /\bProfessional Experience\b/i],
      education: [/\bEducation\b/i, /\bAcademic Background\b/i, /\bQualifications\b/i],
      projects: [/\bProjects\b/i, /\bPersonal Projects\b/i, /\bAcademic Projects\b/i],
      skills: [/\bSkills\b/i, /\bTechnologies\b/i, /\bTechnical Skills\b/i, /\bCore Competencies\b/i],
    };

    const targetRegexes = headers[sectionType] || [];
    let startIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (targetRegexes.some(r => r.test(lines[i]))) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) return '';

    // Capture until next section header
    const allHeaders = Object.values(headers).flat();
    let content = '';
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (allHeaders.some(r => r.test(lines[i]))) {
        break;
      }
      content += lines[i] + '\n';
    }

    return content;
  };

  // Extract Summary
  resume.professional_summary = getSectionContent('profile');

  // Extract Education
  const eduContent = getSectionContent('education');
  if (eduContent) {
    const eduLines = eduContent.split('\n').filter(l => l.trim().length > 5);
    resume.education = eduLines.slice(0, 3).map(line => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const parts = line.split(/,|-|\|/);
      return {
        degree: line.includes('Bachelor') ? 'Bachelor' : line.includes('Master') ? 'Master' : 'Degree',
        field_of_study: parts[2]?.trim() || '',
        institution: parts[0]?.trim() || 'Institution',
        location: '',
        start_date: '',
        end_date: yearMatch ? yearMatch[0] : '',
        grade: ''
      };
    });
  }

  // Extract Experience
  const expContent = getSectionContent('experience');
  if (expContent) {
    const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9])?[\/\s-]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9]|Present|Current)?(?:[\/\s-]*\d{2,4})?/i;
    const blocks = expContent.split(/\n(?=[A-Z])/).filter(b => b.trim().length > 30);
    
    resume.work_experience = blocks.slice(0, 10).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const header = lines[0] || '';
      const subHeader = lines[1] || '';
      
      let title = header;
      let company = 'Organization';
      
      const seps = [/ at /i, / \| /, / - /, / – /, / — /, / , / ];
      let found = false;
      [header, subHeader].forEach(textLine => {
        if (found) return;
        for (const sep of seps) {
          const parts = textLine.split(sep);
          if (parts.length >= 2) {
            title = parts[0].trim();
            company = parts[1].split(/[,(]/)[0].trim();
            found = true;
            break;
          }
        }
      });

      const dateMatch = block.match(datePattern);
      const duration = dateMatch ? dateMatch[0] : '';
      const startDate = duration.split(/[-–—to]+/i)[0]?.trim() || '';
      const endDate = duration.split(/[-–—to]+/i)[1]?.trim() || '';
      
      return {
        company,
        job_title: title,
        location: 'Remote',
        start_date: startDate,
        end_date: endDate,
        is_current: /present|current|now/i.test(duration),
        responsibilities: lines.slice(found ? 1 : 1, 12),
        technologies: []
      };
    });
  }

  // Extract Skills
  const skillContent = getSectionContent('skills');
  const skillsList: string[] = [];
  if (skillContent) {
     const manualSkills = skillContent.split(/[,\n•|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 35);
     skillsList.push(...Array.from(new Set(manualSkills)).slice(0, 20));
     resume.skills = [{
       category: 'Skills',
       items: skillsList
     }];
  }

  resume.all_skills = skillsList;
  resume.personal_info.headline = resume.work_experience[0]?.job_title || 'Software Professional';

  return resume;
}
