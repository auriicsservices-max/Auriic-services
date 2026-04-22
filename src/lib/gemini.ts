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
  // Try these models in order until one works
  const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
  let lastError: any = null;

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

  for (const modelName of modelsToTry) {
    try {
      console.log(`Gemini AI: Attempting parse with ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          // Only use responseSchema for 1.5 models
          ...(modelName.includes('1.5') ? {
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
          } : {})
        }
      });

      const parsedText = response.text || "{}";
      return JSON.parse(parsedText);
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('404')) {
        console.warn(`Model ${modelName} not found, trying next...`);
        continue;
      }
      // If it's a 403, it means the key is valid but service isn't enabled
      if (err.message?.includes('403')) {
        throw new Error("Access Denied (403). Your API Key is valid, but you MUST enable the 'Generative Language API' in your Google Cloud Project: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
      }
      throw err;
    }
  }

  throw new Error(`Gemini AI Error: All tested models failed. Last Error: ${lastError?.message}`);
}
