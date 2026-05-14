import mammoth from 'mammoth';
import nlp from 'compromise';
import * as chrono from 'chrono-node';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { ResumeData, ResumeSchema } from '../types/resume';

// pdf-parse doesn't have good type definitions or ESM support
// We'll use a dynamic require that works after bundling to CJS
// @ts-ignore
const pdf = typeof require !== 'undefined' ? require('pdf-parse') : undefined;

export class RobustResumeParser {
  async parseBuffer(buffer: Buffer, mimetype: string): Promise<ResumeData> {
    let text = '';

    if (mimetype === 'application/pdf') {
      let pdfLib = pdf;
      if (!pdfLib) {
        try {
          const { createRequire } = await import('module');
          const requireBridge = createRequire(import.meta.url);
          pdfLib = requireBridge('pdf-parse');
        } catch (e) {
          throw new Error("PDF parsing library (pdf-parse) not available");
        }
      }
      const data = await pdfLib(buffer);
      text = data.text;
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
    const links = text.match(/https?:\/\/[^\s]+/g) || [];
    let linkedin = '';
    let github = '';
    let portfolio = '';
    links.forEach(link => {
      const l = link.toLowerCase();
      if (l.includes('linkedin.com')) linkedin = link;
      else if (l.includes('github.com')) github = link;
      else if (!l.includes('google') && !l.includes('pdf')) portfolio = link;
    });

    // 5. Sections
    const sections = this.extractSections(text);

    // 6. Total Experience
    const totalExperienceYears = this.calculateTotalExperience(sections.experience);

    const data: ResumeData = {
      name,
      contact: { email, phone, linkedin, github, portfolio },
      profile: sections.profile,
      totalExperienceYears,
      education: this.parseEducation(sections.education),
      experience: this.parseExperience(sections.experience),
      projects: this.parseProjects(sections.projects),
      skills: this.parseSkills(sections.skills, text),
      achievements: this.parseList(sections.achievements),
      languages: this.parseList(sections.languages),
      interests: this.parseList(sections.interests),
      rawText: text,
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

  private parseExperience(text: string): ResumeData['experience'] {
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

  private parseEducation(text: string): ResumeData['education'] {
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

  private parseProjects(text: string): ResumeData['projects'] {
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

  private parseSkills(sectionText: string, fullText: string): ResumeData['skills'] {
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
