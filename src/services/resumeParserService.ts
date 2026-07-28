import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically } from "../lib/localParser";
import { ResumeData } from "../types/resume";
import { toJSONResumeData } from "../utils/jsonResumeMapper";
import { toInternalResumeData } from "../utils/mapper";

/**
 * Robust Resume Parsing Service
 * Client-side interface that orchestrates high-quality server-side Gemini parsing 
 * with automatic local client-side fallback for maximum uptime.
 */
export class ResumeParserService {
  /**
   * Main entry point for parsing a CV file.
   * Uploads file to the server for deep AI-based extraction using Gemini 3.6 Flash.
   * Falls back to local rule-based parsing if offline or rate-limited.
   */
  async parse(file: File, onProgress?: (progress: number) => void): Promise<{ parsed: ResumeData; text: string }> {
    try {
      console.log("[ResumeParserService] Attempting high-precision server-side Gemini parsing...");
      onProgress?.(15);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/parse-gemini', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        onProgress?.(85);
        const parsed = await response.json() as ResumeData;
        console.log("[ResumeParserService] Server-side Gemini parsing completed successfully!");
        onProgress?.(100);
        return { 
          parsed, 
          text: parsed.rawText || '' 
        };
      } else {
        console.warn(`[ResumeParserService] Server parsing responded with status: ${response.status}. Falling back to client-side.`);
      }
    } catch (serverError) {
      console.warn("[ResumeParserService] Server parsing failed or was unreachable. Falling back to client-side:", serverError);
    }

    // CLIENT-SIDE FALLBACK (Offline or server rate-limit/error)
    try {
      console.log("[ResumeParserService] Executing client-side heuristic parsing fallback...");
      onProgress?.(30);
      
      // 1. Extract raw text from file
      const text = await this.extractText(file, (p) => {
        onProgress?.(30 + p * 0.4);
      });
      
      // 2. Parse using local heuristics
      onProgress?.(75);
      const initialParsed = await parseResumeHeuristically(text);
      
      // 3. Map to JSON Resume
      const jsonResume = toJSONResumeData(initialParsed);
      
      // 4. Map back to internal ResumeData
      const parsed = toInternalResumeData(jsonResume);
      parsed.rawText = text;
      
      console.log("[ResumeParserService] Client-side heuristic parsing complete.");
      onProgress?.(100);
      return { parsed, text };
    } catch (error) {
      console.error("[ResumeParserService] Critical client-side parsing failure:", error);
      // Absolute fallback: extract text and return simple heuristic result
      const text = await this.extractText(file);
      const parsed = await parseResumeHeuristically(text);
      parsed.rawText = text;
      return { parsed, text };
    }
  }

  /**
   * Analyze raw text using client-side heuristic engine.
   */
  async analyzeText(text: string): Promise<{ parsed: ResumeData; text: string }> {
    try {
      const parsed = await parseResumeHeuristically(text);
      parsed.rawText = text;
      return { parsed, text };
    } catch (error) {
      console.error("[ResumeParserService] Text analysis failed:", error);
      const parsed = await parseResumeHeuristically(text);
      parsed.rawText = text;
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
