import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, ResumeSchema } from '../types/resume';
import { extractRawTextFromBuffer } from './resumeParserServer';
import { parseResumeHeuristically } from '../lib/localParser';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function retryWithBackoff<T>(fn: () => Promise<T>, retries: number = 3, initialDelay: number = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && (err?.status === 503 || err?.message?.includes('503'))) {
      console.warn(`[GeminiResumeParser] Retrying due to 503... ${retries} retries left. Delay: ${initialDelay}ms`);
      await sleep(initialDelay);
      return retryWithBackoff(fn, retries - 1, initialDelay * 2);
    }
    throw err;
  }
}

export class GeminiResumeParser {
  private getAiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      return new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.warn('[GeminiResumeParser] Failed to initialize GoogleGenAI:', e);
      return null;
    }
  }

  /**
   * High-Precision Direct Multimodal Buffer Parsing (PDF, Images, DOCX)
   */
  async parseBuffer(buffer: Buffer, mimeType: string, filename?: string): Promise<ResumeData> {
    const ai = this.getAiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined or invalid');
    }

    const isMultimodalSupported = mimeType === 'application/pdf' || mimeType.startsWith('image/');

    if (isMultimodalSupported) {
      try {
        console.log(`[GeminiResumeParser] Executing multimodal Gemini parsing for ${filename || 'file'} (${mimeType})...`);
        const base64Data = buffer.toString('base64');
        const contents = [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          `You are an expert executive talent parser for Aurrum CRM. Extract ALL candidate data from this attached resume/CV document into the exact required JSON structure with 100% precision and zero missing fields. Extract every job responsibility, project, link, contact detail, and skill list completely without truncation.`
        ];

        const rawTextFallback = await extractRawTextFromBuffer(buffer, mimeType).catch(() => '');
        return await this.executeGeminiParsing(ai, contents, rawTextFallback);
      } catch (err: any) {
        console.warn('[GeminiResumeParser] Multimodal direct parse failed, falling back to text extraction:', err?.message || err);
      }
    }

    // Fallback or DOCX / TXT: Extract raw text first, then parse text
    const extractedText = await extractRawTextFromBuffer(buffer, mimeType);
    return await this.parseText(extractedText);
  }

  async parseText(text: string): Promise<ResumeData> {
    const ai = this.getAiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined or invalid');
    }

    const promptText = `
You are an expert executive resume parser for the Aurrum CRM talent platform.
Extract EVERY single piece of candidate information from the resume text below completely into the required JSON format.
Do NOT omit or truncate any section, project, responsibility, link, or bullet point.

RESUME TEXT TO PARSE:
${text}
`;

    return await this.executeGeminiParsing(ai, promptText, text);
  }

  private async executeGeminiParsing(ai: GoogleGenAI, contents: any, fallbackRawText: string): Promise<ResumeData> {
    const promptInstructions = `
You are an expert executive resume parser for the Aurrum CRM talent platform.
Extract EVERY single piece of candidate information from the attached resume completely into the exact required JSON structure with 100% precision.

CRITICAL INSTRUCTIONS FOR EDUCATION & SUMMARY EXTRACTION:

1. EDUCATION SECTION EXTRACTION MANDATE:
   - Search the ENTIRE document (including headers, footers, sidebars, multi-column tables, text blocks, and non-standard headings).
   - Detect Education entries regardless of section heading (e.g., "Education", "Academic Background", "Qualifications", "Academic History", "Degrees & Training", "Educational Qualifications", "Schooling", "Credentials", "Studies").
   - Extract ALL education records without exception. For each entry, extract:
     * degree: Exact degree name (e.g., B.Tech, Bachelor of Science, Master of Engineering, M.B.A., Ph.D., High School Diploma, Diploma).
     * field_of_study / course: Major course/discipline (e.g., Computer Science, Information Technology, Business Administration).
     * specialization: Specific concentration or stream if mentioned (e.g., Artificial Intelligence, Software Engineering).
     * institution: Full name of the college, university, institute, or school.
     * board: Board of education or affiliating university/body (e.g., CBSE, ICSE, State Board, Autonomous, Cambridge).
     * location: Campus city/state/country.
     * start_date / start_year & end_date / end_year: Duration or year of passing.
     * grade / gpa: CGPA, percentage, GPA, marks, or class (e.g. 3.8/4.0, 85%, 8.5 CGPA, First Class with Distinction).
     * honors: Academic honors, dean's list, merit awards.
     * certifications: Any certifications or diplomas listed within the education section.
   - FULL-DOCUMENT BACKUP: If no explicit "Education" heading exists, search the full text for degree keywords (Bachelor, B.S., B.Tech, Master, M.S., Ph.D., High School, University, College, Institute, CGPA, GPA, %) and parse every educational milestone found.

2. PROFESSIONAL SUMMARY EXTRACTION MANDATE:
   - Detect summary under ANY heading variation ("Professional Summary", "Career Summary", "Profile Summary", "Executive Summary", "Summary", "Profile", "Objective", "Career Objective", "About Me", "Overview", "Biography", "Personal Statement").
   - UNLABELED SUMMARY DETECTION: If there is no explicit summary header, extract any top paragraph (2-5 sentences located below candidate name/contact info) that summarizes candidate experience, goals, or skills as professional_summary.
   - VERBATIM PRESERVATION: Extract the EXACT, verbatim original summary text. Do NOT summarize, rewrite, rephrase, truncate, or drop any sentences.

3. PROFESSIONAL LINKS & PROJECTS EXTRACTION MANDATE:
   - Extract ALL professional and project-related links found anywhere in the document.
   - Detect and classify: LinkedIn, GitHub, Portfolio, Personal Website, Behance, Dribbble, Stack Overflow, Kaggle, LeetCode, HackerRank, Medium, YouTube, X (Twitter), live demo links, repository links.
   - Extract links into specific platform fields if possible, or into "other_urls" / "other" array.
   - For PROJECTS: Detect all projects listed. Extract:
     * name: Project name.
     * description: Detailed project description.
     * tech_stack: Technologies and tools used.
     * live_url: Link to live demo or project website.
     * code_url: Link to source code repository (e.g., GitHub, GitLab).
     * highlights: Key features or achievements of the project.

4. CONFIDENCE & REVIEW EVALUATION:
   - Assess education_confidence ("high", "medium", "low") and summary_confidence ("high", "medium", "low").
   - Set needs_review = true if Education is completely missing, if Summary is missing, or if confidence is low.
   - List clear review_reasons (e.g., ["Education section missing or incomplete", "Summary section not detected"]).
`;

    const config = {
      responseMimeType: "application/json",
      systemInstruction: promptInstructions,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_resume: { type: Type.BOOLEAN },
          parsing_confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          detected_language: { type: Type.STRING },
          contact: {
            type: Type.OBJECT,
            properties: {
              full_name: { type: Type.STRING },
              email: { type: Type.STRING },
              mobile: { type: Type.STRING },
              designation: { type: Type.STRING },
              location: { type: Type.STRING },
              address: { type: Type.STRING }
            }
          },
          personal_info: {
            type: Type.OBJECT,
            properties: {
              full_name: { type: Type.STRING },
              headline: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: {
                type: Type.OBJECT,
                properties: {
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  country: { type: Type.STRING }
                }
              },
              links: {
                type: Type.OBJECT,
                properties: {
                  linkedin: { type: Type.STRING },
                  github: { type: Type.STRING },
                  portfolio: { type: Type.STRING },
                  website: { type: Type.STRING },
                  other: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          },
          links: {
            type: Type.OBJECT,
            properties: {
              linkedin: { type: Type.STRING },
              github: { type: Type.STRING },
              portfolio: { type: Type.STRING },
              website: { type: Type.STRING },
              other_urls: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          professional_summary: { type: Type.STRING },
          total_experience_years: { type: Type.NUMBER },
          career_level: { type: Type.STRING },
          primary_role: { type: Type.STRING },
          technical_skills: {
            type: Type.OBJECT,
            properties: {
              languages: { type: Type.ARRAY, items: { type: Type.STRING } },
              frontend: { type: Type.ARRAY, items: { type: Type.STRING } },
              backend: { type: Type.ARRAY, items: { type: Type.STRING } },
              databases: { type: Type.ARRAY, items: { type: Type.STRING } },
              cloud_devops: { type: Type.ARRAY, items: { type: Type.STRING } },
              tools: { type: Type.ARRAY, items: { type: Type.STRING } },
              cms_ecommerce: { type: Type.ARRAY, items: { type: Type.STRING } },
              other: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          skills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                items: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          all_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          work_experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                job_title: { type: Type.STRING },
                company: { type: Type.STRING },
                location: { type: Type.STRING },
                start_date: { type: Type.STRING },
                end_date: { type: Type.STRING },
                duration: { type: Type.STRING },
                is_current: { type: Type.BOOLEAN },
                responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                key_achievements: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          key_projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                tech_stack: { type: Type.ARRAY, items: { type: Type.STRING } },
                live_url: { type: Type.STRING },
                code_url: { type: Type.STRING },
                highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                role: { type: Type.STRING },
                live_url: { type: Type.STRING },
                code_url: { type: Type.STRING }
              }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                field_of_study: { type: Type.STRING },
                course: { type: Type.STRING },
                specialization: { type: Type.STRING },
                institution: { type: Type.STRING },
                board: { type: Type.STRING },
                location: { type: Type.STRING },
                start_date: { type: Type.STRING },
                end_date: { type: Type.STRING },
                start_year: { type: Type.STRING },
                end_year: { type: Type.STRING },
                duration: { type: Type.STRING },
                grade: { type: Type.STRING },
                gpa: { type: Type.STRING },
                honors: { type: Type.STRING },
                certifications: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          education_confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          summary_confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          needs_review: { type: Type.BOOLEAN },
          review_reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          certifications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                issuer: { type: Type.STRING },
                year: { type: Type.STRING }
              }
            }
          },
          languages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                language: { type: Type.STRING },
                proficiency: { type: Type.STRING }
              }
            }
          },
          awards: { type: Type.ARRAY, items: { type: Type.STRING } },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    };

    const candidateModels = [
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-3.1-pro-preview"
    ];

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[GeminiResumeParser] Attempting resume parse with model: ${modelName}...`);
        const response = await retryWithBackoff(() => ai.models.generateContent({
          model: modelName,
          contents,
          config,
        }));

        const rawText = response.text || '{}';
        const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const rawObj = JSON.parse(cleanText);
        const normalizedData = normalizeParsedResume(rawObj, fallbackRawText);
        const parsedData = ResumeSchema.parse(normalizedData);
        return parsedData;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
          console.warn('[GeminiResumeParser] Gemini API key invalid.');
          break;
        }
        console.warn(`[GeminiResumeParser] ${modelName} parse failed:`, errMsg);
      }
    }

    // High availability fallback: If all AI models failed or rate-limited, use heuristic parser
    console.warn('[GeminiResumeParser] All Gemini models failed or rate-limited. Falling back to local heuristic extraction engine...');
    const textToParse = (fallbackRawText && fallbackRawText.trim()) ? fallbackRawText : 'Candidate Resume';
    const fallbackResult = await parseResumeHeuristically(textToParse);
    fallbackResult.review_reasons = [
      ...(fallbackResult.review_reasons || []),
      'AI parsing temporarily rate-limited; extracted using high-precision local fallback engine.'
    ];
    fallbackResult.needs_review = true;
    return fallbackResult;
  }
}

function normalizeParsedResume(data: any, rawText: string): ResumeData {
  if (!data || typeof data !== 'object') data = {};

  const fullName = data.contact?.full_name || data.personal_info?.full_name || '';
  const email = data.contact?.email || data.personal_info?.email || '';
  const phone = data.contact?.mobile || data.personal_info?.phone || '';
  const designation = data.contact?.designation || data.personal_info?.headline || data.primary_role || '';
  const locationStr = data.contact?.location || data.contact?.address || '';
  
  const linkedin = data.links?.linkedin || data.personal_info?.links?.linkedin || '';
  const github = data.links?.github || data.personal_info?.links?.github || '';
  const portfolio = data.links?.portfolio || data.personal_info?.links?.portfolio || '';
  const website = data.links?.website || data.personal_info?.links?.website || '';
  const otherUrls = Array.isArray(data.links?.other_urls) 
    ? data.links.other_urls 
    : (Array.isArray(data.personal_info?.links?.other) ? data.personal_info.links.other : []);

  const techSkills = data.technical_skills || {};
  const languagesList = Array.isArray(techSkills.languages) ? techSkills.languages : [];
  const frontendList = Array.isArray(techSkills.frontend) ? techSkills.frontend : [];
  const backendList = Array.isArray(techSkills.backend) ? techSkills.backend : [];
  const databasesList = Array.isArray(techSkills.databases) ? techSkills.databases : [];
  const cloudDevopsList = Array.isArray(techSkills.cloud_devops) ? techSkills.cloud_devops : [];
  const toolsList = Array.isArray(techSkills.tools) ? techSkills.tools : [];
  const cmsEcommerceList = Array.isArray(techSkills.cms_ecommerce) ? techSkills.cms_ecommerce : [];
  const otherTechList = Array.isArray(techSkills.other) ? techSkills.other : [];

  const skillsGrouped: { category: string; items: string[] }[] = Array.isArray(data.skills) ? data.skills : [];
  if (skillsGrouped.length === 0) {
    if (languagesList.length > 0) skillsGrouped.push({ category: 'Languages', items: languagesList });
    if (frontendList.length > 0) skillsGrouped.push({ category: 'Frontend', items: frontendList });
    if (backendList.length > 0) skillsGrouped.push({ category: 'Backend', items: backendList });
    if (databasesList.length > 0) skillsGrouped.push({ category: 'Databases', items: databasesList });
    if (cloudDevopsList.length > 0) skillsGrouped.push({ category: 'Cloud / DevOps', items: cloudDevopsList });
    if (toolsList.length > 0) skillsGrouped.push({ category: 'Tools', items: toolsList });
    if (cmsEcommerceList.length > 0) skillsGrouped.push({ category: 'CMS / E-Commerce', items: cmsEcommerceList });
    if (otherTechList.length > 0) skillsGrouped.push({ category: 'Other', items: otherTechList });
  }

  let allSkills: string[] = Array.isArray(data.all_skills) ? data.all_skills : [];
  if (allSkills.length === 0) {
    const combined = [
      ...languagesList, ...frontendList, ...backendList, ...databasesList,
      ...cloudDevopsList, ...toolsList, ...cmsEcommerceList, ...otherTechList,
      ...skillsGrouped.flatMap((s: any) => s.items || [])
    ].filter(Boolean);
    allSkills = Array.from(new Set(combined));
  }

  const rawWork = Array.isArray(data.work_experience) ? data.work_experience : [];
  const workExperience = rawWork.map((w: any) => {
    const isCurrent = typeof w.is_current === 'boolean' ? w.is_current : (!w.end_date || /present|current/i.test(w.end_date));
    const duration = w.duration || (w.start_date ? `${w.start_date} - ${isCurrent ? 'Present' : (w.end_date || 'Present')}` : (w.end_date || ''));
    return {
      job_title: w.job_title || '',
      company: w.company || '',
      location: w.location || '',
      start_date: w.start_date || '',
      end_date: w.end_date || '',
      duration: duration,
      is_current: isCurrent,
      responsibilities: Array.isArray(w.responsibilities) ? w.responsibilities : [],
      technologies: Array.isArray(w.technologies) ? w.technologies : [],
      key_achievements: Array.isArray(w.key_achievements) ? w.key_achievements : (Array.isArray(w.achievements) ? w.achievements : []),
      achievements: Array.isArray(w.achievements) ? w.achievements : (Array.isArray(w.key_achievements) ? w.key_achievements : [])
    };
  });

  const rawProjects = Array.isArray(data.key_projects) && data.key_projects.length > 0 
    ? data.key_projects 
    : (Array.isArray(data.projects) ? data.projects : []);
  
  const normalizedProjects = rawProjects.map((p: any) => ({
    name: p.name || p.title || '',
    description: p.description || '',
    technologies: Array.isArray(p.tech_stack) ? p.tech_stack : (Array.isArray(p.technologies) ? p.technologies : []),
    role: p.role || '',
    live_url: p.live_url || p.link || p.url || '',
    code_url: p.code_url || ''
  }));

  const normalizedKeyProjects = rawProjects.map((p: any) => ({
    name: p.name || p.title || '',
    description: p.description || '',
    tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : (Array.isArray(p.technologies) ? p.technologies : []),
    live_url: p.live_url || p.link || p.url || '',
    code_url: p.code_url || '',
    highlights: Array.isArray(p.highlights) ? p.highlights : []
  }));

  const rawEdu = Array.isArray(data.education) ? data.education : [];
  const education = rawEdu.map((e: any) => {
    const duration = e.duration || (e.start_year || e.start_date ? `${e.start_year || e.start_date} - ${e.end_year || e.end_date || 'Present'}` : (e.end_year || e.end_date || ''));
    return {
      degree: e.degree || e.field_of_study || e.course || '',
      field_of_study: e.field_of_study || e.course || e.degree || '',
      course: e.course || e.field_of_study || '',
      specialization: e.specialization || '',
      institution: e.institution || e.college || e.university || e.school || '',
      board: e.board || e.affiliation || '',
      location: e.location || '',
      duration: duration,
      start_date: e.start_date || e.start_year || '',
      end_date: e.end_date || e.end_year || '',
      start_year: e.start_year || e.start_date || '',
      end_year: e.end_year || e.end_date || '',
      grade: e.grade || e.gpa || e.cgpa || e.percentage || '',
      gpa: e.gpa || e.grade || e.cgpa || '',
      honors: e.honors || '',
      certifications: Array.isArray(e.certifications) ? e.certifications : []
    };
  });

  const professionalSummary = (data.professional_summary || '').trim();
  
  const eduConfidence = data.education_confidence || (education.length > 0 ? 'high' : 'low');
  const sumConfidence = data.summary_confidence || (professionalSummary ? 'high' : 'low');
  
  const reviewReasons: string[] = Array.isArray(data.review_reasons) ? [...data.review_reasons] : [];
  if (education.length === 0 && !reviewReasons.includes('Education section missing or incomplete')) {
    reviewReasons.push('Education section missing or incomplete');
  }
  if (!professionalSummary && !reviewReasons.includes('Professional summary missing')) {
    reviewReasons.push('Professional summary missing');
  }

  const needsReview = typeof data.needs_review === 'boolean'
    ? data.needs_review
    : (education.length === 0 || !professionalSummary || eduConfidence === 'low' || sumConfidence === 'low');

  return {
    is_resume: data.is_resume ?? true,
    parsing_confidence: data.parsing_confidence || (needsReview ? 'medium' : 'high'),
    detected_language: data.detected_language || 'en',
    contact: {
      full_name: fullName,
      email: email,
      mobile: phone,
      designation: designation,
      location: locationStr,
      address: locationStr
    },
    personal_info: {
      full_name: fullName,
      headline: designation,
      email: email,
      phone: phone,
      location: typeof data.personal_info?.location === 'object' && data.personal_info.location ? {
        city: data.personal_info.location.city || '',
        state: data.personal_info.location.state || '',
        country: data.personal_info.location.country || ''
      } : { city: locationStr, state: '', country: '' },
      links: {
        linkedin,
        github,
        portfolio,
        website,
        other: otherUrls
      }
    },
    links: {
      linkedin,
      github,
      portfolio,
      website,
      other_urls: otherUrls
    },
    professional_summary: professionalSummary,
    education_confidence: eduConfidence,
    summary_confidence: sumConfidence,
    needs_review: needsReview,
    review_reasons: reviewReasons,
    total_experience_years: typeof data.total_experience_years === 'number' ? data.total_experience_years : 0,
    career_level: data.career_level || 'Mid-Level',
    primary_role: data.primary_role || designation,
    technical_skills: {
      languages: languagesList,
      frontend: frontendList,
      backend: backendList,
      databases: databasesList,
      cloud_devops: cloudDevopsList,
      tools: toolsList,
      cms_ecommerce: cmsEcommerceList,
      other: otherTechList
    },
    skills: skillsGrouped,
    all_skills: allSkills,
    work_experience: workExperience,
    key_projects: normalizedKeyProjects,
    projects: normalizedProjects,
    education: education,
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    publications: Array.isArray(data.publications) ? data.publications : [],
    volunteer: Array.isArray(data.volunteer) ? data.volunteer : (Array.isArray(data.volunteering) ? data.volunteering : []),
    volunteering: Array.isArray(data.volunteering) ? data.volunteering : (Array.isArray(data.volunteer) ? data.volunteer : []),
    interests: Array.isArray(data.interests) ? data.interests : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    rawText: rawText
  };
}
