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

export async function parseResume(text: string) {
  const ai = getGenAI();
  const result = await (ai as any).models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract organized candidate data from this resume text. Return JSON format.
    Resume Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          summary: { type: Type.STRING },
          domain: { type: Type.STRING, description: "Extract the primary professional domain e.g. Software Engineering, Sales, Human Resources, Finance" },
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
          }
        },
        required: ["fullName"]
      }
    }
  });

  return JSON.parse(result.text);
}
