import { GoogleGenAI, Type } from "@google/genai";

export interface AIPreparedCandidate {
  id: string;
  fullName: string;
  skills?: string[] | Record<string, string[]>;
  domainFocus?: string;
  domain?: string;
  position?: string;
  experience?: string | number;
  location?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  matchedIds?: string[];
}

export class GeminiSearchAssistant {
  private getAiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      return new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.warn('[GeminiSearchAssistant] Failed to initialize GoogleGenAI client:', e);
      return null;
    }
  }

  async search(
    query: string, 
    candidates: AIPreparedCandidate[], 
    history: ChatMessage[] = [],
    precision?: 'semantic' | 'exact'
  ): Promise<{
    matchedIds: string[];
    explanation: string;
  }> {
    // Flatten / sanitize skills for all candidates to guarantee accurate matching on both frontend & backend
    const sanitizedCandidates = candidates.map(c => {
      let flatSkills: string[] = [];
      if (Array.isArray(c.skills)) {
        flatSkills = c.skills;
      } else if (c.skills && typeof c.skills === 'object') {
        flatSkills = Object.values(c.skills)
          .filter(Array.isArray)
          .flat() as string[];
      }
      return {
        ...c,
        skills: flatSkills
      };
    });

    const ai = this.getAiClient();

    if (!ai || !process.env.GEMINI_API_KEY) {
      console.log('[GeminiSearchAssistant] GEMINI_API_KEY missing or invalid client. Using rule-based fallback filter.');
      return this.fallbackFilter(query, sanitizedCandidates);
    }

    // Format conversation history to feed to Gemini
    const formattedHistory = history.map(msg => {
      return `${msg.role === 'user' ? 'User' : 'Assistant (Matched Candidates: ' + (msg.matchedIds || []).join(',') + ')'}: ${msg.text}`;
    }).join('\n\n');

    const prompt = `
      You are an ultra-fast, highly accurate AI Chat Assistant integrated into the Aurrum CRM CV Repository system.
      Your primary job is to help users query, parse, and extract information from candidate resumes (CVs) instantly.

      ---
      # RULES & OBJECTIVES

      1. CHAT HISTORY & CONTEXT TRACKING:
         - Maintain a strict context window of the ongoing conversation.
         - Refer back to previous candidates mentioned in the session when the user uses pronouns (e.g., "What are his Python skills?" or "Show her contact info").
         - If the chat history contains a list of filtered candidates (indicated by the assistant's previous matches), allow the user to refine that specific list (e.g., "Now filter them by 3+ years of React experience").
         - If the query is a generic question or conversation (e.g., "hi", "how are you"), reply politely and explain how you can help them find candidates.

      2. SEARCH PRECISION MODE:
         - Currently in [${precision || 'semantic'}] precision mode.
         - If in "exact" mode, require strict exact keyword matches for skills, titles, or locations. Do not use loose semantic expansion.
         - If in "semantic" mode, find matches using conceptual relevance (e.g. matching "Healthcare" to healthcare professionals, or "web developer" to frontend engineer / React specialist).

      3. RESPONSE SPEED & SEARCH ACCURACY:
         - Direct Key-Value Parsing: Treat CV metrics like Years of Experience, Tech Stack, Domain Focus, and Location as structured data. Extract these accurately.
         - Semantic/Exact match execution: Only match candidates who fit the query requirements.
         - Concise Summarization: Prioritize response speed and clarity.

      4. FLEXIBLE UI & PRESENTATION DESIGN:
         For ANY matching candidate, format their profile evaluation using clean Markdown with distinct structural wrappers exactly as follows:
         
         ## [Candidate Name] | [Primary Title]
         * **Experience:** [X Years]
         * **Top Skills:** \`Skill 1\`, \`Skill 2\`, \`Skill 3\`
         * **Quick Match Assessment:** [1-sentence summary of why they match the query]
         > **Key Highlight:** [Extract 1 major achievement or standout detail from their profile]

      5. EDGE CASES & GUARDRAILS:
         - If no candidate matches the query, state it clearly and suggest alternative search terms.
         - Do not hallucinate skills or metrics.

      ---
      # CANDIDATES DATA (${sanitizedCandidates.length} Candidates Available):
      ${JSON.stringify(sanitizedCandidates, null, 2)}

      ---
      # CONVERSATION HISTORY:
      ${formattedHistory || "No previous history."}

      ---
      # USER QUERY:
      "${query}"

      Please generate a JSON response strictly following this schema:
      {
        "matchedIds": Array of string IDs of the matched candidates in order of relevance,
        "explanation": "Your complete Markdown response conforming to the rules and presentation design."
      }
    `;

    const config = {
      responseMimeType: "application/json" as const,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchedIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          explanation: { type: Type.STRING }
        },
        required: ["matchedIds", "explanation"]
      }
    };

    try {
      console.log('[GeminiSearchAssistant] Attempting search with gemini-2.5-flash...');
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config
      });

      const rawText = response.text || '{}';
      const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleanText);
      return {
        matchedIds: Array.isArray(parsed.matchedIds) ? parsed.matchedIds : [],
        explanation: parsed.explanation || 'Search complete.'
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn('[GeminiSearchAssistant] gemini-2.5-flash search error details:', errMsg);
      
      // Retry with fallback model: gemini-2.0-flash
      try {
        console.log('[GeminiSearchAssistant] Retrying search with fallback model: gemini-2.0-flash...');
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config
        });

        const rawText = response.text || '{}';
        const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(cleanText);
        return {
          matchedIds: Array.isArray(parsed.matchedIds) ? parsed.matchedIds : [],
          explanation: parsed.explanation || 'Search complete.'
        };
      } catch (fallbackErr: any) {
        console.warn('[GeminiSearchAssistant] Gemini models unavailable or rate limited. Falling back to rule-based heuristic search.', fallbackErr?.message);
        return this.fallbackFilter(query, sanitizedCandidates);
      }
    }
  }

  private fallbackFilter(query: string, candidates: AIPreparedCandidate[]): { matchedIds: string[]; explanation: string } {
    const rawQuery = query.trim().toLowerCase();
    
    // Stopwords to ignore in multi-term search
    const stopWords = new Set(['in', 'for', 'with', 'a', 'an', 'the', 'candidates', 'candidate', 'developer', 'developers', 'engineer', 'engineers', 'show', 'me', 'find', 'get', 'list']);
    const queryTerms = rawQuery.split(/\s+/).filter(term => term.length > 1 && !stopWords.has(term));

    const matches = candidates.filter(c => {
      const name = (c.fullName || '').toLowerCase();
      const domain = (c.domainFocus || c.domain || '').toLowerCase();
      const pos = (c.position || '').toLowerCase();
      const loc = (c.location || '').toLowerCase();
      
      let flatSkills: string[] = [];
      if (Array.isArray(c.skills)) {
        flatSkills = c.skills;
      } else if (c.skills && typeof c.skills === 'object') {
        flatSkills = Object.values(c.skills)
          .filter(Array.isArray)
          .flat() as string[];
      }
      const skillsStr = flatSkills.map(s => s.toLowerCase()).join(' ');
      const fullCandidateText = `${name} ${domain} ${pos} ${loc} ${skillsStr}`;

      // Check if candidate matches raw query or any key term
      if (fullCandidateText.includes(rawQuery)) return true;
      if (queryTerms.length > 0) {
        return queryTerms.some(term => fullCandidateText.includes(term));
      }
      return false;
    });

    let explanation = `### Search Results for "${query}"\n\n`;
    if (matches.length === 0) {
      explanation += `No candidates found matching the search criteria **"${query}"**. Try searching for specific skills (e.g., 'React', 'Python'), location (e.g., 'Ahmedabad', 'Remote'), or domain focus (e.g., 'Healthcare', 'IT').`;
    } else {
      matches.forEach(c => {
        explanation += `## ${c.fullName} | ${c.position || c.domainFocus || 'Professional'}\n`;
        const expStr = c.experience && typeof c.experience !== 'object'
          ? `${c.experience} Years`
          : 'Not specified in CV';
        explanation += `* **Experience:** ${expStr}\n`;
        
        let flatSkills: string[] = [];
        if (Array.isArray(c.skills)) {
          flatSkills = c.skills;
        } else if (c.skills && typeof c.skills === 'object') {
          flatSkills = Object.values(c.skills)
            .filter(Array.isArray)
            .flat() as string[];
        }
        explanation += `* **Top Skills:** ${flatSkills.length > 0 ? flatSkills.slice(0, 8).map(s => `\`${s}\``).join(', ') : 'Not specified in CV'}\n`;
        explanation += `* **Quick Match Assessment:** Matched candidate profile for query criteria **"${query}"**.\n`;
        explanation += `> **Key Highlight:** Domain Focus: ${c.domainFocus || 'General Industry'} | Location: ${c.location || 'Not specified'}.\n\n`;
      });
    }

    return {
      matchedIds: matches.map(c => c.id),
      explanation
    };
  }
}


