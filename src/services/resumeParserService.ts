import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically } from "../lib/localParser";
import { ResumeData, ResumeSchema } from "../types/resume";
import { GoogleGenAI, Type } from "@google/genai";
import retry from "async-retry";

/**
 * Robust Resume Parsing Service
 * High-performance, rule-based extraction engine using specialized libraries.
 */
export class ResumeParserService {
  private genAI: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Main entry point for parsing a CV file.
   * Uses rule-based extraction in backend for high precision.
   */
  async parse(file: File): Promise<{ parsed: ResumeData; text: string }> {
    let text = "";
    try {
      // 1. Extract raw text
      text = await this.extractText(file);
      
      let initialParsed: ResumeData;

      // 2. Try Gemini first (Robust parsing)
      if (this.genAI) {
        try {
          initialParsed = await this.parseWithGemini(text);
          return { parsed: initialParsed, text };
        } catch (geminiError) {
          console.warn("[ResumeParser] Gemini failed, trying backend next:", geminiError);
        }
      }

      // 3. Try Advanced Parser via backend
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

  private async extractText(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(buffer);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      return await extractTextFromDocx(buffer);
    }
    return await file.text();
  }

  private async parseWithGemini(text: string): Promise<ResumeData> {
    return await retry(async (bail) => {
      try {
        const prompt = `
          Extract structured data from the following resume text. 
          Respond in JSON format.
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
                    profile: { type: Type.STRING },
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
        
        const parsed = JSON.parse(resultText);
        parsed.rawText = text;
        
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
