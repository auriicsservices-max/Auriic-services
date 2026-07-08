import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically } from "../lib/localParser";
import { ResumeData, ResumeSchema } from "../types/resume";
import { GoogleGenAI, Type } from "@google/genai";
import Anthropic from '@anthropic-ai/sdk';
import retry from "async-retry";

/**
 * Robust Resume Parsing Service
 * High-performance, rule-based extraction engine using specialized libraries.
 */
export class ResumeParserService {
  private genAI: GoogleGenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
    }
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }
  }

  /**
   * Main entry point for parsing a CV file.
   * Uses rule-based extraction in backend for high precision.
   */
  async parse(file: File, onProgress?: (progress: number) => void): Promise<{ parsed: ResumeData; text: string }> {
    let text = "";
    try {
      // 1. Extract raw text
      text = await this.extractText(file, onProgress);
      
      let initialParsed: ResumeData;

      // 2. Try Anthropic first (Robust parsing)
      if (this.anthropic) {
        try {
          initialParsed = await this.parseWithAnthropic(text);
          return { parsed: initialParsed, text };
        } catch (anthropicError) {
          console.warn("[ResumeParser] Anthropic failed, trying Gemini next:", anthropicError);
        }
      }

      // 3. Try Gemini next
      if (this.genAI) {
        try {
          initialParsed = await this.parseWithGemini(text);
          return { parsed: initialParsed, text };
        } catch (geminiError) {
          console.warn("[ResumeParser] Gemini failed, trying Waterfall next:", geminiError);
        }
      }

      // 4. Try Waterfall (Claude -> ChatGPT)
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/cv/parse-waterfall', {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          initialParsed = await response.json();
          return { parsed: initialParsed, text };
        } else {
          console.warn("[ResumeParser] Waterfall parser error, trying backend next");
        }
      } catch (e) {
        console.warn("[ResumeParser] Waterfall connection failed, trying backend next:", e);
      }

      // 5. Try Advanced Parser via backend
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/cv/parse-advanced', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          initialParsed = await response.json();
        } else {
          console.warn("[ResumeParser] Backend parser error, falling back to heuristics");
          initialParsed = await parseResumeHeuristically(text);
        }
      } catch (e) {
        console.warn("[ResumeParser] Backend connection failed, using local heuristics:", e);
        initialParsed = await parseResumeHeuristically(text);
      }
      
      return { parsed: initialParsed, text };
    } catch (error) {
      console.error("[ResumeParser] Critical parsing failure:", error);
      const parsed = await parseResumeHeuristically(text || "Error extracting text.");
      return { parsed, text };
    }
  }

  /**
   * Analyze raw text using heuristic engine.
   */
  async analyzeText(text: string): Promise<{ parsed: ResumeData; text: string }> {
    try {
      const parsed = await parseResumeHeuristically(text);
      return { parsed, text };
    } catch (error) {
      console.error("[ResumeParser] Text analysis failed:", error);
      const parsed = await parseResumeHeuristically(text);
      return { parsed, text };
    }
  }

  private async extractText(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const buffer = await file.arrayBuffer();
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(buffer, onProgress);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      return await extractTextFromDocx(buffer);
    }
    return await file.text();
  }

  private async parseWithAnthropic(text: string): Promise<ResumeData> {
    return await retry(async (bail) => {
      try {
        const prompt = `
          Extract structured data from the following resume text.
          Respond ONLY in JSON format according to this structure:
          {
            "name": "Full Name",
            "contact": { "email": "Email", "phone": "Phone", "linkedin": "LinkedIn", "github": "GitHub", "portfolio": "Portfolio" },
            "links": [{ "type": "Social/Project Type", "url": "URL" }],
            "location": { "city": "City", "state": "State", "country": "Country", "postalCode": "Postal Code", "display": "Formatted string" },
            "profile": "Summary or profile",
            "domainFocus": "Main professional domain",
            "totalExperienceYears": 0,
            "education": [{ "institution": "Institution", "degree": "Degree", "duration": "Duration" }],
            "experience": [{ "title": "Title", "company": "Company", "duration": "Duration", "responsibilities": ["Resp 1"] }],
            "projects": [{ "name": "Name", "description": ["Desc 1"], "technologies": ["Tech 1"], "duration": "Duration", "links": ["Link 1"] }],
            "skills": { "languages": ["L1"], "frameworks": ["F1"], "databases": ["D1"], "tools": ["T1"], "libraries": ["Lib1"], "other": ["O1"] },
            "achievements": ["Ach1"],
            "languages": ["Lang1"],
            "interests": ["Int1"]
          }
          Resume text:
          ${text.slice(0, 30000)}
        `;

        const response = await this.anthropic!.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        const content = (response.content[0] as any).text;
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in Anthropic response");
        
        let parsed = JSON.parse(jsonMatch[0]);
        parsed.rawText = text;

        // Skill Normalization and Deduplication
        const normalizeSkill = (s: string) => {
          let normalized = s.trim();
          const lower = normalized.toLowerCase();
          if (lower === 'react.js' || lower === 'reactjs') return 'React';
          if (lower === 'node.js' || lower === 'nodejs') return 'Node.js';
          if (lower === 'vue.js' || lower === 'vuejs') return 'Vue.js';
          if (lower === 'javascript' || lower === 'js') return 'JavaScript';
          if (lower === 'typescript' || lower === 'ts') return 'TypeScript';
          if (normalized.length > 0 && !normalized.includes(' ') && normalized === lower) {
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
          }
          return normalized;
        };

        if (parsed.skills) {
          Object.keys(parsed.skills).forEach(category => {
            if (Array.isArray(parsed.skills[category])) {
              const uniqueNormalized = Array.from(new Set(
                (parsed.skills[category] as string[]).map(s => normalizeSkill(s))
              ));
              parsed.skills[category] = uniqueNormalized;
            }
          });
        }
        
        return ResumeSchema.parse(parsed);
      } catch (error: any) {
        if (error?.status === 400 || error?.name === 'ZodError') {
          bail(error);
          return null as any;
        }
        throw error;
      }
    }, {
      retries: 3,
      minTimeout: 2000,
      maxTimeout: 10000,
      onRetry: (err, i) => console.warn(`[Anthropic] Retry ${i}:`, err.message)
    });
  }

  private async parseWithGemini(text: string): Promise<ResumeData> {
    return await retry(async (bail) => {
      try {
        const prompt = `
          Extract structured data from the following resume text. 
          Respond in JSON format according to this structure:
          {
            "name": "Full Name",
            "currentRole": "Current Title",
            "experience": "Total years of experience",
            "phone": "Phone number",
            "email": "Email address",
            "links": [{ "type": "Social/Project Type", "url": "URL" }],
            "location": { "city": "City", "state": "State", "country": "Country", "postalCode": "Postal Code", "display": "Formatted string" },
            "domainFocus": ["Profession 1", "Profession 2"],
            "currentCompany": "Company name",
            "previousCompanies": ["Company 1", "Company 2"],
            "skills": ["Skill 1", "Skill 2"],
            "education": { "degree": "Degree", "university": "University", "location": "Location", "graduationYear": "Year" }
          }
          Also, ensure the fields required by the internal resume schema are fully populated based on the extracted data: Experience (array of objects with title, company, duration, responsibilities), Education (array), Projects (array), and Skills (categorized by language, framework, database, tools, etc.).
        `;

        const response = await this.genAI!.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `${prompt}\n\nResume text:\n${text.slice(0, 30000)}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    contact: {
                        type: Type.OBJECT,
                        properties: {
                            email: { type: Type.STRING },
                            phone: { type: Type.STRING },
                            linkedin: { type: Type.STRING },
                            github: { type: Type.STRING },
                            portfolio: { type: Type.STRING }
                        }
                    },
                    links: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING },
                                url: { type: Type.STRING }
                            }
                        }
                    },
                    location: {
                        type: Type.OBJECT,
                        properties: {
                            city: { type: Type.STRING },
                            state: { type: Type.STRING },
                            country: { type: Type.STRING },
                            postalCode: { type: Type.STRING, description: "ZIP or postal code if available on resume" },
                            display: { type: Type.STRING, description: "Full formatted location string" }
                        }
                     },
                    profile: { type: Type.STRING },
                    domainFocus: { type: Type.STRING, description: "Main professional domain (IT, Healthcare, etc.)" },
                    totalExperienceYears: { type: Type.NUMBER },
                    education: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                institution: { type: Type.STRING },
                                degree: { type: Type.STRING },
                                duration: { type: Type.STRING }
                            }
                        }
                    },
                    experience: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                company: { type: Type.STRING },
                                duration: { type: Type.STRING },
                                responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    },
                    projects: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.ARRAY, items: { type: Type.STRING } },
                                technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                                duration: { type: Type.STRING },
                                links: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    },
                    skills: {
                        type: Type.OBJECT,
                        properties: {
                            languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                            frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            databases: { type: Type.ARRAY, items: { type: Type.STRING } },
                            tools: { type: Type.ARRAY, items: { type: Type.STRING } },
                            libraries: { type: Type.ARRAY, items: { type: Type.STRING } },
                            other: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    },
                    achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                    interests: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
          }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("Empty response from Gemini");
        
        let parsed = JSON.parse(resultText);
        parsed.rawText = text;

        const geminiLocation = parsed.location || {};
        parsed.locationDetails = {
          city: geminiLocation.city || '',
          state: geminiLocation.state || '',
          country: geminiLocation.country || '',
          postalCode: geminiLocation.postalCode || ''
        };
        parsed.location = geminiLocation.display || (geminiLocation.city ? `${geminiLocation.city}, ${geminiLocation.state || ''}` : '');

        // Skill Normalization and Deduplication
        const normalizeSkill = (s: string) => {
          let normalized = s.trim();
          const lower = normalized.toLowerCase();
          
          // Common normalization rules
          if (lower === 'react.js' || lower === 'reactjs') return 'React';
          if (lower === 'node.js' || lower === 'nodejs') return 'Node.js';
          if (lower === 'vue.js' || lower === 'vuejs') return 'Vue.js';
          if (lower === 'javascript' || lower === 'js') return 'JavaScript';
          if (lower === 'typescript' || lower === 'ts') return 'TypeScript';
          
          // Title case for others if they are single words and not already capitalized
          if (normalized.length > 0 && !normalized.includes(' ') && normalized === lower) {
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
          }
          
          return normalized;
        };

        if (parsed.skills) {
          Object.keys(parsed.skills).forEach(category => {
            if (Array.isArray(parsed.skills[category])) {
              const uniqueNormalized = Array.from(new Set(
                (parsed.skills[category] as string[]).map(s => normalizeSkill(s))
              ));
              parsed.skills[category] = uniqueNormalized;
            }
          });
        }
        
        return ResumeSchema.parse(parsed);
      } catch (error: any) {
        if (error?.status === 400 || error?.name === 'ZodError') {
          bail(error);
          return null as any;
        }
        throw error;
      }
    }, {
      retries: 3,
      minTimeout: 2000,
      maxTimeout: 10000,
      onRetry: (err, i) => console.warn(`[Gemini] Retry ${i}:`, err.message)
    });
  }
}

export const resumeParser = new ResumeParserService();
