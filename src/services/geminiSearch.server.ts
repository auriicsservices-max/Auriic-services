import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

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
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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

    // Format conversation history to feed to Gemini
    const formattedHistory = history.map(msg => {
      return `${msg.role === 'user' ? 'User' : 'Assistant (Matched Candidates: ' + (msg.matchedIds || []).join(',') + ')'}: ${msg.text}`;
    }).join('\n\n');

    const prompt = `
      You are an ultra-fast, highly accurate AI Chat Assistant integrated into the Rectec CV Repository system.
      Your primary job is to help users query, parse, and extract information from candidate resumes (CVs) instantly.

      ---
      # RULES & OBJECTIVES

      1. CHAT HISTORY & CONTEXT TRACKING:
         - Maintain a strict context window of the ongoing conversation.
         - Refer back to previous candidates mentioned in the session when the user uses pronouns (e.g., "What are his Python skills?" or "Show her contact info" should reference the last discussed candidate from the history).
         - If the chat history contains a list of filtered candidates (indicated by the assistant's previous matches), allow the user to refine that specific list (e.g., "Now filter them by 3+ years of React experience").
         - If the query is a generic question or conversation (e.g., "hi", "how are you"), reply politely and explain how you can help them find candidates.

      2. SEARCH PRECISION MODE:
         - Currently in [${precision || 'semantic'}] precision mode.
         - If in "exact" mode, you MUST require strict exact keyword matches for skills, titles, or locations. Do not use loose semantic expansion (e.g., if the user searches for "React", do NOT match a candidate who only has "Angular" or "Vue" unless they also explicitly list "React").
         - If in "semantic" mode, you are free to find matches using conceptual relevance (e.g. matching "web developer" to "frontend engineer" or "React specialist").

      3. RESPONSE SPEED & SEARCH ACCURACY:
         - Direct Key-Value Parsing: Treat CV metrics like Years of Experience, Tech Stack, and Location as structured data. Extract these with 100% accuracy.
         - Semantic/Exact match execution: Only match candidates who fit the selected precision requirements above.
         - Concise Summarization: Prioritize response speed by avoiding long paragraphs. Synthesize candidate profiles into scannable data points first.

      4. FLEXIBLE UI & PRESENTATION DESIGN:
         For ANY matching candidate, ALWAYS format their profile evaluation using clean Markdown with distinct structural wrappers exactly as follows:
         
         ## [Candidate Name] | [Primary Title]
         * **Experience:** [X Years]
         * **Top Skills:** \`Skill 1\`, \`Skill 2\`, \`Skill 3\`
         * **Quick Match Assessment:** [1-sentence summary of why they match or fail the query]
         > **Key Highlight:** [Extract 1 major achievement or standout project from their CV]

      5. EDGE CASES & GUARDRAILS:
         - If no candidate matches the query, state it immediately and suggest alternative search terms to save user time.
         - Do not hallucinate skills or metrics. If a CV doesn’t state a piece of information, label it as "Not specified in CV".

      ---
      # CANDIDATES DATA:
      ${JSON.stringify(sanitizedCandidates, null, 2)}

      ---
      # CONVERSATION HISTORY:
      ${formattedHistory || "No previous history."}

      ---
      # USER QUERY:
      "${query}"

      Please generate a JSON response strictly following this schema:
      {
        "matchedIds": Array of string IDs of the matched candidates in order of relevance (only include candidates that are relevant to the query/filter),
        "explanation": "Your complete Markdown response conforming to the rules and presentation design."
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          },
          responseMimeType: "application/json",
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
        },
      });

      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (err) {
      console.error('[GeminiSearchAssistant] Search Error:', err);
      return this.fallbackFilter(query, sanitizedCandidates);
    }
  }

  private fallbackFilter(query: string, candidates: AIPreparedCandidate[]): { matchedIds: string[]; explanation: string } {
    const q = query.toLowerCase();
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
      const skills = flatSkills.map(s => s.toLowerCase());

      return name.includes(q) || 
             domain.includes(q) || 
             pos.includes(q) || 
             loc.includes(q) || 
             skills.some(s => s.includes(q));
    });

    let explanation = `### Search Results for "${query}"\n\n`;
    if (matches.length === 0) {
      explanation += `No candidates found matching the search criteria. Try searching for skills like 'React' or domains like 'IT'.`;
    } else {
      matches.forEach(c => {
        explanation += `## ${c.fullName} | ${c.position || 'Professional'}\n`;
        explanation += `* **Experience:** ${c.experience || 'Not specified in CV'}\n`;
        
        let flatSkills: string[] = [];
        if (Array.isArray(c.skills)) {
          flatSkills = c.skills;
        } else if (c.skills && typeof c.skills === 'object') {
          flatSkills = Object.values(c.skills)
            .filter(Array.isArray)
            .flat() as string[];
        }
        explanation += `* **Top Skills:** ${flatSkills.length > 0 ? flatSkills.map(s => `\`${s}\``).join(', ') : 'Not specified in CV'}\n`;
        explanation += `* **Quick Match Assessment:** Highly qualified professional matching query criteria.\n`;
        explanation += `> **Key Highlight:** Standout background in ${c.domainFocus || 'industry Focus'}.\n\n`;
      });
    }

    return {
      matchedIds: matches.map(c => c.id),
      explanation
    };
  }
}

