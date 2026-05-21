import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set up worker for PDF.js using a reliable CDN path
// Hardcoding the version to match package.json to avoid issues with pdfjs.version
const PDFJS_VERSION = '4.10.38';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

import { ResumeData } from '../types/resume';
export type ParsedResume = ResumeData;

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
    name: '',
    contact: {
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      portfolio: ''
    },
    location: {
      city: '',
      state: '',
      country: ''
    },
    profile: '',
    totalExperienceYears: 0,
    education: [],
    experience: [],
    projects: [],
    skills: {
      languages: [],
      frameworks: [],
      databases: [],
      tools: [],
      libraries: [],
      other: []
    },
    achievements: [],
    languages: [],
    interests: [],
    rawText: text,
    domainFocus: 'Other'
  };

  // 0. Domain Focus Heuristic
  const domainKeywords: Record<string, RegExp[]> = {
    'IT': [/software/i, /developer/i, /programmer/i, /engineer/i, /backend/i, /frontend/i, /fullstack/i, /cloud/i, /devops/i, /cybersecurity/i, /data science/i, /it consultant/i],
    'Healthcare': [/doctor/i, /nurse/i, /medical/i, /healthcare/i, /clinician/i, /hospital/i, /pharmacy/i, /patient care/i],
    'Finance': [/accounting/i, /finance/i, /audit/i, /banking/i, /investment/i, /ledger/i, /tax/i, /cpa/i, /fintech/i],
    'Sales': [/sales/i, /account manager/i, /business development/i, /quota/i, /leads/i, /client acquisition/i],
    'Marketing': [/marketing/i, /seo/i, /content strategy/i, /social media/i, /branding/i, /digital marketing/i, /advertising/i],
    'HR': [/human resources/i, /talent acquisition/i, /recruitment/i, /payroll/i, /employee relations/i, /staffing/i],
    'Operations': [/operations manager/i, /supply chain/i, /logistics/i, /operational/i, /process improvement/i],
    'Engineering': [/mechanical/i, /civil/i, /electrical/i, /structural/i, /manufacturing/i, /industrial engineering/i]
  };

  for (const [domain, patterns] of Object.entries(domainKeywords)) {
    if (patterns.some(p => p.test(text))) {
        resume.domainFocus = domain;
        break;
    }
  }

  // 1. Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) resume.contact.email = emailMatch[0];

  // 2. Extract Phone (Improved)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) resume.contact.phone = phoneMatch[0];

  // 3. Extract Name (Heuristic refined: check first few lines for capitalized names)
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Improved location heuristic
  for(let i=0; i<Math.min(20, lines.length); i++) {
    const line = lines[i];
    // Try to match "City, State, Country" or "City, State"
    // Examples: "San Jose, CA", "Mumbai, Maharashtra", "London, UK"
    const match = line.match(/([A-Za-z\s]+),\s*([A-Za-z\s]+)(?:,\s*([A-Za-z\s]+))?/);
    if (match && match[1].length > 2 && match[2].length > 1) { // Basic validation
        resume.location.city = match[1].trim();
        resume.location.state = match[2].trim();
        if (match[3]) resume.location.country = match[3].trim();
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
            resume.name = line;
            break;
        }
    }
    
    if (!resume.name) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line.length > 3 && line.length < 35 && !line.includes('@') && !line.includes(':')) {
                resume.name = line;
                break;
            }
        }
    }
  }

  // 4. Extract Links
  const linkRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const allLinks = text.match(linkRegex) || [];
  const uniqueLinks = Array.from(new Set(allLinks));
  
  uniqueLinks.forEach(link => {
    const l = link.toLowerCase();
    if (l.includes('linkedin.com')) {
      resume.contact.linkedin = link;
    } else if (l.includes('github.com')) {
      resume.contact.github = link;
    } else if (l.includes('portfolio') || l.includes('personal-website')) {
      resume.contact.portfolio = link;
    }
  });

  // 5. Section detection and localized extraction
  const sections: Record<string, RegExp[]> = {
    profile: [/\bSummary\b/i, /\bProfile\b/i, /\bObjective\b/i, /\bAbout Me\b/i, /\bProfessional Summary\b/i, /\bCareer Objective\b/i, /\bProfessional Profile\b/i],
    experience: [/\bExperience\b/i, /\bWork History\b/i, /\bEmployment\b/i, /\bProfessional Experience\b/i, /\bCareer History\b/i, /\bRelevant Experience\b/i, /\bWork Experience\b/i, /\bProfessional Background\b/i],
    education: [/\bEducation\b/i, /\bAcademic\b/i, /\bQualifications\b/i, /\bEducation Background\b/i, /\bEducational Qualifications\b/i, /\bAcademic Credentials\b/i],
    skills: [/\bSkills\b/i, /\bCompetencies\b/i, /\bTechnologies\b/i, /\bCore Skills\b/i, /\bTechnical Competencies\b/i, /\bExpertise\b/i, /\bTechnical Skills\b/i, /\bCore Competencies\b/i, /\bSkills & Tools\b/i]
  };

  const getSectionContent = (sectionKey: string): string => {
    const regexes = sections[sectionKey];
    let startIdx = -1;

    for (const regex of regexes) {
      const match = text.match(regex);
      if (match && match.index !== undefined) {
        startIdx = match.index + match[0].length;
        break;
      }
    }

    if (startIdx === -1) return '';

    let endIdx = text.length;
    for (const key in sections) {
      for (const regex of sections[key]) {
        const subText = text.substring(startIdx);
        const match = subText.match(regex);
        if (match && match.index !== undefined) {
          const absoluteIdx = startIdx + match.index;
          if (absoluteIdx < endIdx && absoluteIdx > startIdx) {
            endIdx = absoluteIdx;
          }
        }
      }
    }

    return text.substring(startIdx, endIdx).trim();
  };

  // Extract Profile/Summary
  const profileContent = getSectionContent('profile');
  resume.profile = profileContent.split('\n').filter(s => s.length > 20).slice(0, 5).join(' ') || profileContent.substring(0, 600);

  // Extract Education
  const eduContent = getSectionContent('education');
  if (eduContent) {
    const eduBlocks = eduContent.split(/\n(?=[A-Z])/).filter(b => b.trim().length > 10);
    resume.education = eduBlocks.slice(0, 5).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const degreeMatch = block.match(/(?:Bachelor|Master|B\.S\.|M\.S\.|PhD|Associate|Degree|BSc|MSc|MBA|Engineering|Diploma|B\.A\.|M\.A\.)/i);
      const yearMatch = block.match(/\b(19|20)\d{2}\b/);
      
      return {
        degree: degreeMatch ? degreeMatch[0] : (lines[0] || 'Degree'),
        institution: lines.find(l => !l.match(/(?:Bachelor|Master|B\.S\.|M\.S\.|PhD|Associate|Degree|BSc|MSc|MBA|Engineering|Diploma|B\.A\.|M\.A\.)/i) && l.length > 5) || lines[1] || 'Institution',
        duration: yearMatch ? yearMatch[0] : 'N/A'
      };
    });
  }

  // Extract Experience
  const expContent = getSectionContent('experience');
  if (expContent) {
    const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9])?[\/\s-]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9]|Present|Current)?(?:[\/\s-]*\d{2,4})?/i;
    const blocks = expContent.split(/\n(?=[A-Z])/).filter(b => b.trim().length > 30);
    
    resume.experience = blocks.slice(0, 10).map(block => {
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
      
      return {
        company,
        title,
        duration: dateMatch ? dateMatch[0] : 'N/A',
        responsibilities: lines.slice(found ? 1 : 1, 12)
      };
    });
  }

  // Extract Skills
  const skillContent = getSectionContent('skills');
  if (skillContent) {
     const manualSkills = skillContent.split(/[,\n•|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 35);
     resume.skills.other = Array.from(new Set(manualSkills)).slice(0, 20);
  }

  return resume;
}
