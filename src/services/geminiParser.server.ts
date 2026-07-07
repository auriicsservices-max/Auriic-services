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

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
      },
    });

    const data = JSON.parse(response.text || '{}');
    return ResumeSchema.parse(data);
  }
}
