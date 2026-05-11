import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set up worker for PDF.js using a reliable CDN path
// Hardcoding the version to match package.json to avoid issues with pdfjs.version
const PDFJS_VERSION = '4.10.38';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export interface ParsedResume {
  file_name: string;
  candidate: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string | null;
  };
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    job_title: string;
    location: string | null;
    start_date: string;
    end_date: string;
    responsibilities: string[];
  }>;
  education: Array<{
    institution: string;
    location: string | null;
    degree: string;
    year: string;
  }>;
  certifications: string[];
  achievements: string[];
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
    file_name: '',
    candidate: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: null
    },
    summary: '',
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    achievements: []
  };

  // 1. Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) resume.email = emailMatch[0];

  // 2. Extract Phone (Improved)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) resume.phone = phoneMatch[0];

  // 3. Extract Name (Heuristic refined: check first few lines for capitalized names)
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    const commonTitles = ['cv', 'resume', 'curriculum', 'profile', 'summary', 'address', 'page', 'email', 'phone'];
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        if (line.length > 40 || line.includes('@') || line.includes('http') || /\d/.test(line)) continue;
        if (commonTitles.some(t => line.toLowerCase().includes(t))) continue;

        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w))) {
            resume.fullName = line;
            break;
        }
    }
    
    if (!resume.fullName) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line.length > 3 && line.length < 35 && !line.includes('@') && !line.includes(':')) {
                resume.fullName = line;
                break;
            }
        }
    }
  }

  // 4. Extract Links (LinkedIn, GitHub, Portfolio)
  const linkPatterns = [
    { label: 'LinkedIn', regex: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i },
    { label: 'GitHub', regex: /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i },
    { label: 'Behance', regex: /(?:https?:\/\/)?(?:www\.)?behance\.net\/[a-zA-Z0-9_-]+/i },
    { label: 'Dribbble', regex: /(?:https?:\/\/)?(?:www\.)?dribbble\.com\/[a-zA-Z0-9_-]+/i },
    { label: 'X', regex: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_-]+/i },
    { label: 'Generic', regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi }
  ];

  const foundLinksMap = new Map<string, string>();
  linkPatterns.forEach(pattern => {
    const matches = text.match(pattern.regex);
    if (matches) {
      matches.forEach(match => {
        let url = match.trim();
        if (!url.startsWith('http')) url = `https://${url}`;
        
        let label = pattern.label;
        if (label === 'Generic') {
            if (url.includes('linkedin.com')) label = 'LinkedIn';
            else if (url.includes('github.com')) label = 'GitHub';
            else if (url.includes('twitter.com') || url.includes('x.com')) label = 'X';
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

  // 5. Domain Extraction (Aggressive Score System)
  const domainKeywords: Record<string, string[]> = {
    'Software Engineering': ['developer', 'software', 'engineer', 'frontend', 'backend', 'fullstack', 'coder', 'web', 'javascript', 'python', 'java', 'react', 'c++', 'c#', 'node', 'express', 'devops', 'cloud', 'architecture', 'api', 'docker', 'database', 'typescript', 'full stack'],
    'Data Science & AI': ['data', 'scientist', 'analysis', 'analytics', 'machine learning', 'ai', 'statistical', 'modeling', 'sql', 'big data', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'deep learning', 'nlp', 'bi', 'llm', 'rag', 'genai', 'pinecone'],
    'Telecommunications': ['telecom', 'wireless', '5g', '4g', 'rf', 'network infrastructure', 'fiber optics', 'antennae', 'base station', 'ran', 'site development', 'in-building', 'macro wireless', 'telecommunications systems'],
    'Project & Program Management': ['pmp', 'project manager', 'program manager', 'scrum master', 'agile', 'lifecycle', 'budgeting', 'scheduling', 'resource allocation', 'stakeholder', 'vendor management', 'rfp', 'change order', 'pmo', 'milestones'],
    'Marketing': ['marketing', 'brand', 'advertising', 'social media', 'content', 'seo', 'sem', 'campaign', 'growth', 'copywriter', 'pr', 'communications', 'digital marketing', 'email marketing'],
    'Sales': ['sales', 'account executive', 'business development', 'revenue', 'prospecting', 'lead generation', 'closing', 'saas sales', 'crm', 'client acquisition'],
    'Human Resources': ['hr', 'recruiter', 'recruiting', 'talent', 'human resources', 'compensation', 'benefits', 'compliance', 'sourcing', 'onboarding', 'hiring', 'culture'],
    'Design & Creative': ['designer', 'ui', 'ux', 'product designer', 'graphic designer', 'illustrator', 'creative', 'adobe', 'figma', 'sketch', 'canva', 'prototyping', 'interaction design', 'motion design'],
    'Finance & Accounting': ['finance', 'accountant', 'accounting', 'banking', 'investment', 'ledger', 'audit', 'tax', 'financial analyst', 'treasury', 'cpa', 'wealth management'],
    'Infrastructure & Networking': ['cisco', 'juniper', 'router', 'switch', 'data center', 'tcp/ip', 'lan', 'wan', 'cctv', 'ubiquiti', 'vlan', 'subnet', 'firewall', 'palo alto', 'nexus'],
    'Construction & Engineering': ['construction', 'civil', 'osha', 'autocad', 'blueprints', 'permitting', 'site survey', 'infrastructure development', 'zoning', 'estimating', 'mop'],
    'Humanitarian & NGO': ['unhcr', 'ngo', 'non-profit', 'humanitarian', 'refugee', 'protection', 'advocacy', 'peacekeeping', 'disaster relief']
  };

  const domainScores: Record<string, number> = {};
  Object.entries(domainKeywords).forEach(([dom, kws]) => {
    domainScores[dom] = 0;
    kws.forEach(kw => {
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9#+.])${escapedKw}([^a-zA-Z0-9#+.]|$)`, 'gi');
      const matches = text.match(regex);
      if (matches) domainScores[dom] += matches.length;
    });
  });

  const bestDomain = Object.entries(domainScores).reduce((a, b) => b[1] > a[1] ? b : a, ['General', 0]);
  resume.domain = bestDomain[1] > 2 ? bestDomain[0] : 'General';

  // 6. Skills Extraction (Broad Dictionary)
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
    'Azure', 'GCP', 'Jenkins', 'Terraform', 'Ansible', 'Linux', 'Security', 'Cybersecurity',
    'PMP', 'OSHA 10', 'OSHA 30', 'CCNA', 'CWNA', 'BGP', 'OSPF', 'EIGRP', '5G', 'RF', 'Fiber Optics',
    'Microsoft Office', 'Excel', 'Word', 'PowerPoint', 'Google Analytics', 'WordPress',
    'Interpreting', 'Translation', 'Event Planning', 'Public Relations', 'Quality Assurance'
  ];
  
  const foundSkills = new Set<string>();
  commonSkills.forEach(skill => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9#+.])${escapedSkill}([^a-zA-Z0-9#+.]|$)`, 'gi');
    if (regex.test(text)) {
      foundSkills.add(skill);
    }
  });
  
  // Detect skills even if not in dictionary (capitalized words near "Skills" section)
  resume.skills = Array.from(foundSkills);

  // 7. Section detection and localized extraction
  const sections: Record<string, RegExp[]> = {
    summary: [/\bSummary\b/i, /\bProfile\b/i, /\bObjective\b/i, /\bAbout Me\b/i, /\bProfessional Summary\b/i, /\bCareer Objective\b/i, /\bProfessional Profile\b/i],
    experience: [/\bExperience\b/i, /\bWork History\b/i, /\bEmployment\b/i, /\bProfessional Experience\b/i, /\bCareer History\b/i, /\bRelevant Experience\b/i, /\bWork Experience\b/i, /\bProfessional Background\b/i],
    education: [/\bEducation\b/i, /\bAcademic\b/i, /\bQualifications\b/i, /\bEducation Background\b/i, /\bEducational Qualifications\b/i, /\bAcademic Credentials\b/i],
    skills: [/\bSkills\b/i, /\bCompetencies\b/i, /\bTechnologies\b/i, /\bCore Skills\b/i, /\bTechnical Competencies\b/i, /\bExpertise\b/i, /\bTechnical Skills\b/i, /\bCore Competencies\b/i, /\bSkills & Tools\b/i]
  };

  const getSectionContent = (sectionKey: string): string => {
    const regexes = sections[sectionKey];
    let startIdx = -1;
    let foundRegex: RegExp | null = null;

    for (const regex of regexes) {
      const match = text.match(regex);
      if (match && match.index !== undefined) {
        startIdx = match.index + match[0].length;
        foundRegex = regex;
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

  // Extract Summary
  const summaryContent = getSectionContent('summary');
  resume.summary = summaryContent.split('\n').filter(s => s.length > 20).slice(0, 5).join(' ') || summaryContent.substring(0, 600);

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
        school: lines.find(l => !l.match(/(?:Bachelor|Master|B\.S\.|M\.S\.|PhD|Associate|Degree|BSc|MSc|MBA|Engineering|Diploma|B\.A\.|M\.A\.)/i) && l.length > 5) || lines[1] || 'Institution',
        year: yearMatch ? yearMatch[0] : 'N/A'
      };
    });
  }

  // Extract Experience
  const expContent = getSectionContent('experience');
  if (expContent) {
    // Advanced Split: Look for dates or company-style lines
    const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9])?[\/\s-]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1][0-9]|Present|Current)?(?:[\/\s-]*\d{2,4})?/i;
    
    // Split by blocks that clearly contain a date and start with a heading-like line
    const blocks = expContent.split(/\n(?=[A-Z])/).filter(b => b.trim().length > 30);
    
    resume.experience = blocks.slice(0, 10).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const header = lines[0] || '';
      const subHeader = lines[1] || '';
      
      let role = 'Professional';
      let company = 'Organization';
      
      // Try to split header or subheader for role/company
      const seps = [/ at /i, / \| /, / - /, / – /, / — /, / , / ];
      let found = false;
      [header, subHeader].forEach(textLine => {
        if (found) return;
        for (const sep of seps) {
          const parts = textLine.split(sep);
          if (parts.length >= 2) {
            role = parts[0].trim();
            company = parts[1].split(/[,(]/)[0].trim();
            found = true;
            break;
          }
        }
      });
      
      if (!found) role = header;

      const dateMatch = block.match(datePattern);
      
      return {
        role,
        company,
        duration: dateMatch ? dateMatch[0] : 'N/A',
        description: lines.slice(found ? 1 : 1, 12).join(' ').substring(0, 1000)
      };
    });
  }

  // Final Skill Sync
  const skillContent = getSectionContent('skills');
  if (skillContent && resume.skills.length < 5) {
     const manualSkills = skillContent.split(/[,\n•|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 35);
     resume.skills = Array.from(new Set([...resume.skills, ...manualSkills])).slice(0, 20);
  }

  return resume;
}
