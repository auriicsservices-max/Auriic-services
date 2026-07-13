import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, ResumeSchema } from '../types/resume';

export class GeminiResumeParser {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    this.ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
        }
    });
  }

  async parseText(text: string): Promise<ResumeData> {
    const prompt = `
      Extract structured resume data from the following text into a JSON object.
      Follow the schema strictly.
      
      Resume text:
      ${text}
    `;

    const config = {
      responseMimeType: "application/json" as const,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          fullName: { type: Type.STRING },
          company: { type: Type.STRING },
          contact: {
              type: Type.OBJECT,
              properties: {
                  email: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  linkedin: { type: Type.STRING },
                  github: { type: Type.STRING },
                  portfolio: { type: Type.STRING },
              }
          },
          location: { type: Type.STRING },
          profile: { type: Type.STRING },
          domainFocus: { type: Type.STRING },
          totalExperienceYears: { type: Type.NUMBER },
          skills: {
              type: Type.OBJECT,
              properties: {
                  languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                  frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  databases: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tools: { type: Type.ARRAY, items: { type: Type.STRING } },
                  libraries: { type: Type.ARRAY, items: { type: Type.STRING } },
                  other: { type: Type.ARRAY, items: { type: Type.STRING } },
              }
          }
        }
      }
    };

    try {
      console.log('[GeminiResumeParser] Attempting resume parse with gemini-3.5-flash...');
      const response = await this.ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config,
      });

      const data = JSON.parse(response.text || '{}');
      return ResumeSchema.parse(data);
    } catch (err: any) {
      console.warn('[GeminiResumeParser] gemini-3.5-flash parsing failed. Error details:', err?.message || err);
      
      try {
        console.log('[GeminiResumeParser] Retrying resume parse with fallback model: gemini-3.1-flash-lite...');
        const response = await this.ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config,
        });

        const data = JSON.parse(response.text || '{}');
        return ResumeSchema.parse(data);
      } catch (fallbackErr: any) {
        console.error('[GeminiResumeParser] Fallback model gemini-3.1-flash-lite also failed parsing:', fallbackErr?.message || fallbackErr);
        throw fallbackErr;
      }
    }
  }
}
