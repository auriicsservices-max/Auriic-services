import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically } from "../lib/localParser";
import { ResumeData } from "../types/resume";

/**
 * Robust Resume Parsing Service
 * High-performance, rule-based extraction engine using specialized libraries.
 */
export class ResumeParserService {
  /**
   * Main entry point for parsing a CV file.
   * Uses rule-based extraction in backend for high precision.
   */
  async parse(file: File): Promise<{ parsed: ResumeData; text: string }> {
    let text = "";
    try {
      // 1. Extract raw text for fallback context
      text = await this.extractText(file);
      
      let initialParsed: ResumeData;

      // 2. Try Advanced Parser via backend
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/cv/parse-advanced', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          initialParsed = await response.json();
        } else {
          console.warn("[ResumeParser] Backend parser error, falling back to heuristics");
          initialParsed = await parseResumeHeuristically(text);
        }
      } catch (e) {
        console.warn("[ResumeParser] Backend connection failed, using local heuristics:", e);
        initialParsed = await parseResumeHeuristically(text);
      }
      
      return { parsed: initialParsed, text };
    } catch (error) {
      console.error("[ResumeParser] Critical parsing failure:", error);
      const parsed = await parseResumeHeuristically(text || "Error extracting text.");
      return { parsed, text };
    }
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

export const resumeParser = new ResumeParserService();
