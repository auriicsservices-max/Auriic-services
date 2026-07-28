import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, ResumeSchema } from '../types/resume';

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

  async parseText(text: string): Promise<ResumeData> {
    const ai = this.getAiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined or invalid');
    }

    const prompt = `
You are an expert resume parser for the Aurrum CRM talent platform.
Extract EVERY single piece of information from the resume text below completely.
Return ONLY a valid JSON object — no prose, no explanation, no markdown formatting.

Extract the following structure completely:
{
  "contact": {
    "full_name": "",
    "email": "",
    "mobile": "",
    "designation": "",
    "location": "",
    "address": ""
  },
  "links": {
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "website": "",
    "other_urls": []
  },
  "professional_summary": "",
  "technical_skills": {
    "languages": [],
    "frontend": [],
    "backend": [],
    "databases": [],
    "cloud_devops": [],
    "tools": [],
    "cms_ecommerce": [],
    "other": []
  },
  "work_experience": [
    {
      "job_title": "",
      "company": "",
      "location": "",
      "start_date": "",
      "end_date": "",
      "duration": "",
      "is_current": false,
      "responsibilities": [],
      "achievements": []
    }
  ],
  "education": [
    {
      "degree": "",
      "field_of_study": "",
      "institution": "",
      "location": "",
      "start_year": "",
      "end_year": "",
      "gpa": "",
      "honors": ""
    }
  ],
  "key_projects": [
    {
      "name": "",
      "description": "",
      "tech_stack": [],
      "live_url": "",
      "code_url": "",
      "highlights": []
    }
  ],
  "certifications": [],
  "languages": [
    {
      "language": "",
      "proficiency": ""
    }
  ],
  "awards": [],
  "volunteering": [],
  "publications": [],
  "interests": [],
  "total_experience_years": 0,
  "career_level": "",
  "primary_role": ""
}

Rules:
- Fill every field you can find. Use empty strings or empty arrays for missing fields.
- For work_experience responsibilities: extract EVERY bullet point completely, do NOT truncate or merge.
- For technical_skills: categorize skills properly into the subcategories (languages, frontend, backend, databases, cloud_devops, tools, cms_ecommerce, other).
- For key_projects: extract every project with all details including live URLs and GitHub code links.
- total_experience_years: calculate from job dates or explicit text.
- career_level: "Junior", "Mid-Level", "Senior", or "Lead" based on experience.
- primary_role: the main job title/role of the candidate.

RESUME TEXT TO PARSE:
${text}
`;

    const config = {
      responseMimeType: "application/json",
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
                institution: { type: Type.STRING },
                location: { type: Type.STRING },
                start_date: { type: Type.STRING },
                end_date: { type: Type.STRING },
                start_year: { type: Type.STRING },
                end_year: { type: Type.STRING },
                grade: { type: Type.STRING },
                gpa: { type: Type.STRING },
                honors: { type: Type.STRING }
              }
            }
          },
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

    try {
      console.log('[GeminiResumeParser] Attempting resume parse with gemini-3.5-flash...');
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config,
      });

      const rawText = response.text || '{}';
      const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const rawObj = JSON.parse(cleanText);
      const normalizedData = normalizeParsedResume(rawObj, text);
      const parsedData = ResumeSchema.parse(normalizedData);
      return parsedData;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
        console.log('[GeminiResumeParser] Gemini API key invalid.');
        throw new Error('Gemini API key invalid');
      }

      console.warn('[GeminiResumeParser] gemini-3.5-flash parsing failed. Error details:', errMsg);
      
      try {
        console.log('[GeminiResumeParser] Retrying resume parse with fallback model: gemini-3.1-pro-preview...');
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config,
        });

        const rawText = response.text || '{}';
        const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const rawObj = JSON.parse(cleanText);
        const normalizedData = normalizeParsedResume(rawObj, text);
        const parsedData = ResumeSchema.parse(normalizedData);
        return parsedData;
      } catch (fallbackErr: any) {
        console.log('[GeminiResumeParser] Fallback parsing error.');
        throw fallbackErr;
      }
    }
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
      degree: e.degree || '',
      field_of_study: e.field_of_study || '',
      institution: e.institution || '',
      location: e.location || '',
      duration: duration,
      start_date: e.start_date || e.start_year || '',
      end_date: e.end_date || e.end_year || '',
      start_year: e.start_year || e.start_date || '',
      end_year: e.end_year || e.end_date || '',
      grade: e.grade || e.gpa || '',
      gpa: e.gpa || e.grade || '',
      honors: e.honors || ''
    };
  });

  return {
    is_resume: data.is_resume ?? true,
    parsing_confidence: data.parsing_confidence || 'high',
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
    professional_summary: data.professional_summary || '',
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
