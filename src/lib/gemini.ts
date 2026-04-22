import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function parseResume(fileData: { mimeType: string; data: string } | string) {
  const ai = getGenAI();

  const prompt = `Extract organized candidate data from this resume for a recruitment system. Return ONLY a valid JSON object.
  Fields to extract: 
  - fullName (required)
  - email
  - phone
  - summary (professional bio)
  - domain (e.g. Software Engineering, Sales, HR, Finance)
  - skills (array of strings, e.g. ["React", "Python", "Project Management"])
  - experience (array of {role, company, duration, description})
  - education (array of {degree, school, year})
  - links (array of {label, url})`;

  const parts = [
    { text: prompt },
    ...(typeof fileData === 'string' 
      ? [{ text: `Resume Content: ${fileData.slice(0, 30000)}` }] 
      : [{ inlineData: fileData }])
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          summary: { type: Type.STRING },
          domain: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                company: { type: Type.STRING },
                duration: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                school: { type: Type.STRING },
                year: { type: Type.STRING }
              }
            }
          },
          links: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                url: { type: Type.STRING }
              }
            }
          }
        },
        required: ["fullName"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
