import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from "../lib/localParser";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Enhanced CV Parsing Service
 * High-performance, heuristic extraction engine, augmented with Gemini LLM for precision.
 */
export class EnhancedCVParser {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  /**
   * Main entry point for parsing a CV file.
   * Uses rule-based extraction followed by LLM-based enhancement for accuracy.
   */
  async parse(file: File): Promise<{ parsed: ParsedResume; text: string }> {
    let text = "";
    try {
      // 1. High Velocity Text Extraction
      text = await this.extractText(file);
      return this.analyzeText(text);
    } catch (error) {
      console.error("[EnhancedCVParser] Parsing failed:", error);
      const parsed = await parseResumeHeuristically(text || "Error extracting text.");
      return { parsed, text };
    }
  }

  /**
   * Directly analyze text using Gemini for core extraction.
   */
  async analyzeText(text: string): Promise<{ parsed: ParsedResume; text: string }> {
    try {
      // 1. Initial Heuristic Extraction
      const initialParsed = await parseResumeHeuristically(text);
      
      // 2. LLM Enhancement for Precision
      const enhancedParsed = await this.enhanceWithGemini(text, initialParsed);
      
      return { parsed: enhancedParsed, text };
    } catch (error) {
      console.error("[EnhancedCVParser] Text analysis failed:", error);
      const parsed = await parseResumeHeuristically(text);
      return { parsed, text };
    }
  }

  private async enhanceWithGemini(text: string, initial: ParsedResume): Promise<ParsedResume> {
    if (!process.env.GEMINI_API_KEY) return initial;

    const prompt = `Parse the following CV text and extract specific fields.
    Return only valid JSON matching this exact schema:
    {
      "file_name": "string",
      "candidate": {
        "name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "linkedin": "string",
        "links": ["string"]
      },
      "summary": "string",
      "skills": ["string"],
      "experience": [
        {
          "company": "string",
          "job_title": "string",
          "location": "string",
          "start_date": "string",
          "end_date": "string",
          "responsibilities": ["string"]
        }
      ],
      "education": [
        {
          "institution": "string",
          "location": "string",
          "degree": "string",
          "year": "string"
        }
      ],
      "certifications": ["string"],
      "achievements": ["string"]
    }
    If a field is not found, leave as empty string, empty array, or null as appropriate.
    CV Text:
    ${text.substring(0, 10000)}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      
      if (response.text) {
        const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const enhanced = JSON.parse(cleanedText);
        return { ...initial, ...enhanced };
      }
    } catch (e: any) {
      console.error("[EnhancedCVParser] Gemini enhancement failed", e);
    }
    return initial;
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
}

export const enhancedParser = new EnhancedCVParser();
