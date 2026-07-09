import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically } from "../lib/localParser";
import { ResumeData } from "../types/resume";
import { toJSONResumeData } from "../utils/jsonResumeMapper";
import { toInternalResumeData } from "../utils/mapper";
import { GoogleGenAI } from "@google/genai";
import { JSONResumeData } from "../types/jsonResume";

/**
 * Robust Resume Parsing Service
 * High-performance, rule-based extraction engine using specialized libraries.
 */
export class ResumeParserService {
  private genAI: GoogleGenAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
    }
  }
  /**
   * Main entry point for parsing a CV file.
   * Uses rule-based extraction in backend for high precision.
   */
  async parse(file: File, onProgress?: (progress: number) => void): Promise<{ parsed: ResumeData; text: string }> {
    try {
      // 1. Extract raw text
      const text = await this.extractText(file, onProgress);
      
      // 2. Parse using local heuristics
      let initialParsed = await parseResumeHeuristically(text);
      
      // 3. Map to JSON Resume to check for missing fields
      let jsonResume = toJSONResumeData(initialParsed);
      
      // Check for missing fields
      const missingFields = this.getMissingFields(jsonResume);
      
      if (missingFields.length > 0 && this.genAI) {
        // 4. Call Gemini only for missing fields
        jsonResume = await this.fillMissingFieldsWithGemini(text, jsonResume, missingFields);
      }
      
      // 5. Map back to internal ResumeData
      const parsed = toInternalResumeData(jsonResume);
      
      return { parsed, text };
    } catch (error) {
      console.error("[ResumeParser] Critical parsing failure:", error);
      // Fallback in case of failure
      const text = await this.extractText(file, onProgress);
      const parsed = await parseResumeHeuristically(text);
      return { parsed, text };
    }
  }

  private getMissingFields(jsonResume: JSONResumeData): string[] {
    const missing: string[] = [];
    if (!jsonResume.basics.name) missing.push("basics.name");
    if (!jsonResume.basics.email) missing.push("basics.email");
    if (jsonResume.work.length === 0) missing.push("work");
    if (jsonResume.skills.length === 0) missing.push("skills");
    return missing;
  }

  private async fillMissingFieldsWithGemini(text: string, currentJson: JSONResumeData, missingFields: string[]): Promise<JSONResumeData> {
      const prompt = `
        The following resume data is incomplete. Please fill in ONLY the missing fields specified below, based on the provided resume text.
        Missing fields: ${missingFields.join(", ")}
        
        Current JSON:
        ${JSON.stringify(currentJson)}
        
        Resume text:
        ${text.slice(0, 30000)}
        
        Respond ONLY in the same JSON format.
      `;
      const response = await this.genAI!.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
      });
      const resultText = response.text;
      if (!resultText) return currentJson;
      return { ...currentJson, ...JSON.parse(resultText) };
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
}

export const resumeParser = new ResumeParserService();
