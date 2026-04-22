import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

async function startServer() {
  const PORT = 3000;
  
  // Use Middleware
  app.use(express.json({ limit: '10mb' }));

  // Gemini API Setup
  const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    return new GoogleGenAI({ apiKey });
  };

  // API Route for Resume Parsing
  app.post('/api/parse-resume', async (req, res) => {
    try {
      const { fileData } = req.body;
      const ai = getAI();

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

      let parts: any[] = [{ text: prompt }];

      if (typeof fileData === 'string') {
        parts.push({ text: `Resume Content: ${fileData.slice(0, 30000)}` });
      } else if (fileData && fileData.data && fileData.mimeType) {
        parts.push({
          inlineData: {
            data: fileData.data,
            mimeType: fileData.mimeType
          }
        });
      } else {
        return res.status(400).json({ error: "Invalid file data provided" });
      }

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

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to parse resume" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving logic
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Aurrum Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
