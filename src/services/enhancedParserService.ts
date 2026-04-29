import { extractTextFromPDF, extractTextFromDocx, parseResumeHeuristically, ParsedResume } from "../lib/localParser";

/**
 * Enhanced CV Parsing Service
 * High-performance, rule-based extraction engine for CVs.
 * Completely local and privacy-focused (No LLM/AI models used).
 */
export class EnhancedCVParser {
  
  /**
   * Main entry point for parsing a CV file.
   * Returns both the parsed data and the original extracted text.
   */
  async parse(file: File): Promise<{ parsed: ParsedResume; text: string }> {
    let text = "";
    try {
      // 1. High Velocity Text Extraction
      text = await this.extractText(file);
      
      // 2. Advanced Heuristic Extraction (Rule-based)
      // This analyzes patterns, keywords, and document structure
      const parsed = await parseResumeHeuristically(text);
      
      return { parsed, text };
    } catch (error) {
      console.error("[EnhancedCVParser] Extraction failed:", error);
      // Ensure we always return something useful even on failure
      if (!text) {
        try {
          text = await this.extractText(file);
        } catch (e) {
          text = "Extraction Error. Please check file format.";
        }
      }
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

export const enhancedParser = new EnhancedCVParser();
