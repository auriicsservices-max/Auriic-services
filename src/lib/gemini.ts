import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      console.error("Gemini API Error: GEMINI_API_KEY is missing from the client bundle.");
      throw new Error("AI API Key not found. If you just added it to Vercel, please REDEPLOY your project to bake the key into the build.");
    }
    console.log("Gemini AI: Initialized successfully.");
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function parseResume(fileData: { mimeType: string; data: string } | string) {
  const ai = getGenAI();
  const modelName = "gemini-1.5-flash";

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

  try {
    const response = await ai.models.generateContent({
      model: modelName,
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

    const parsedText = response.text || "{}";
    return JSON.parse(parsedText);
  } catch (err: any) {
    console.error("Gemini AI API Error:", err);
    throw new Error(`Gemini AI Error: ${err.message || 'Access Denied. Check your API Key permissions.'}`);
  }
}
