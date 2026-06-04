import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData } from "../types/resume";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function parseWithGemini(rawText: string): Promise<Partial<ResumeData>> {
  const prompt = `
    Extract structured resume data from the following text. 
    Ensure you fill in as much detail as possible, including subfields like company location, project descriptions, project links, education fields, and GPA.
    
    Raw Resume Text:
    ${rawText}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are an expert resume parser. Extract structured information. If a field is not present, use an empty string or empty array as appropriate.",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          profile: { type: Type.STRING },
          domainFocus: { type: Type.STRING },
          totalExperienceYears: { type: Type.NUMBER },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                institution: { type: Type.STRING },
                degree: { type: Type.STRING },
                field: { type: Type.STRING },
                duration: { type: Type.STRING },
                gpa: { type: Type.STRING },
                location: { type: Type.STRING },
              },
            },
          },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                duration: { type: Type.STRING },
                location: { type: Type.STRING },
                responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                duration: { type: Type.STRING },
                description: { type: Type.ARRAY, items: { type: Type.STRING } },
                links: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
        },
      },
    },
  });

  const jsonResult = JSON.parse(response.text || '{}');
  return jsonResult;
}
