import LZString from 'lz-string';

export interface BooleanSearchToken {
  type: 'WORD' | 'PHRASE' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN';
  value?: string;
}

/**
 * Tokenize a Boolean query string supporting AND, OR, NOT, quotes, and parentheses.
 */
export function tokenizeBooleanQuery(query: string): BooleanSearchToken[] {
  const tokens: BooleanSearchToken[] = [];
  let i = 0;
  const str = query.trim();

  while (i < str.length) {
    const char = str[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
      continue;
    }

    // Quoted exact phrase
    if (char === '"' || char === "'") {
      const quoteChar = char;
      i++;
      let phrase = '';
      while (i < str.length && str[i] !== quoteChar) {
        phrase += str[i];
        i++;
      }
      if (i < str.length && str[i] === quoteChar) {
        i++; // skip closing quote
      }
      if (phrase.trim()) {
        tokens.push({ type: 'PHRASE', value: phrase.trim().toLowerCase() });
      }
      continue;
    }

    // Words / Operators
    let word = '';
    while (i < str.length && !/\s|\(|\)|"|'/.test(str[i])) {
      word += str[i];
      i++;
    }

    const upperWord = word.toUpperCase();
    if (upperWord === 'AND') {
      tokens.push({ type: 'AND' });
    } else if (upperWord === 'OR') {
      tokens.push({ type: 'OR' });
    } else if (upperWord === 'NOT') {
      tokens.push({ type: 'NOT' });
    } else if (word) {
      tokens.push({ type: 'WORD', value: word.toLowerCase() });
    }
  }

  // Insert implicit AND between adjacent terms/expressions where operators are missing
  const implicitTokens: BooleanSearchToken[] = [];
  for (let j = 0; j < tokens.length; j++) {
    const curr = tokens[j];
    implicitTokens.push(curr);

    if (j < tokens.length - 1) {
      const next = tokens[j + 1];
      const currIsOperand = curr.type === 'WORD' || curr.type === 'PHRASE' || curr.type === 'RPAREN';
      const nextIsOperand = next.type === 'WORD' || next.type === 'PHRASE' || next.type === 'LPAREN' || next.type === 'NOT';

      if (currIsOperand && nextIsOperand) {
        implicitTokens.push({ type: 'AND' });
      }
    }
  }

  return implicitTokens;
}

/**
 * Evaluates tokenized query against searchable document string.
 */
function evaluateTokens(docText: string, tokens: BooleanSearchToken[]): boolean {
  if (tokens.length === 0) return true;

  let pos = 0;

  function parseExpression(): boolean {
    let left = parseTerm();
    while (pos < tokens.length && tokens[pos].type === 'OR') {
      pos++; // consume OR
      const right = parseTerm();
      left = left || right;
    }
    return left;
  }

  function parseTerm(): boolean {
    let left = parseFactor();
    while (pos < tokens.length && tokens[pos].type === 'AND') {
      pos++; // consume AND
      const right = parseFactor();
      left = left && right;
    }
    return left;
  }

  function parseFactor(): boolean {
    if (pos >= tokens.length) return true;

    const token = tokens[pos];

    if (token.type === 'NOT') {
      pos++; // consume NOT
      const val = parseFactor();
      return !val;
    }

    if (token.type === 'LPAREN') {
      pos++; // consume (
      const result = parseExpression();
      if (pos < tokens.length && tokens[pos].type === 'RPAREN') {
        pos++; // consume )
      }
      return result;
    }

    if (token.type === 'WORD' || token.type === 'PHRASE') {
      pos++;
      if (!token.value) return true;
      return docText.includes(token.value);
    }

    pos++;
    return true;
  }

  try {
    return parseExpression();
  } catch {
    return true;
  }
}

/**
 * Builds document search text for candidate.
 */
export function buildCandidateSearchableText(candidate: any): string {
  if (!candidate) return '';

  let resumeText = candidate.rawResumeText || '';
  if (!resumeText && candidate.compressedText) {
    try {
      resumeText = LZString.decompressFromUTF16(candidate.compressedText) || '';
    } catch {
      resumeText = '';
    }
  }

  const name = candidate.fullName || '';
  const position = candidate.position || candidate.domainFocus || candidate.domain || '';
  
  let skillsStr = '';
  if (Array.isArray(candidate.skills)) {
    skillsStr = candidate.skills.join(' ');
  } else if (candidate.skills && typeof candidate.skills === 'object') {
    skillsStr = Object.values(candidate.skills).flat().join(' ');
  }
  if (Array.isArray(candidate.matchedCustomSkills)) {
    skillsStr += ' ' + candidate.matchedCustomSkills.join(' ');
  }

  let expStr = '';
  if (Array.isArray(candidate.experience)) {
    expStr = candidate.experience.map((e: any) => 
      typeof e === 'string' ? e : `${e.role || e.title || ''} ${e.company || ''} ${e.description || ''}`
    ).join(' ');
  } else if (typeof candidate.experience === 'string') {
    expStr = candidate.experience;
  }

  let eduStr = '';
  if (Array.isArray(candidate.education)) {
    eduStr = candidate.education.map((ed: any) =>
      typeof ed === 'string' ? ed : `${ed.degree || ''} ${ed.field || ed.major || ''} ${ed.institution || ed.university || ed.school || ''}`
    ).join(' ');
  } else if (typeof candidate.education === 'string') {
    eduStr = candidate.education;
  }

  let certsStr = '';
  if (Array.isArray(candidate.certifications)) {
    certsStr = candidate.certifications.map((c: any) =>
      typeof c === 'string' ? c : (c.name || c.title || '')
    ).join(' ');
  } else if (typeof candidate.certifications === 'string') {
    certsStr = candidate.certifications;
  }

  const locStr = typeof candidate.locationInfo === 'object' && candidate.locationInfo
    ? `${candidate.locationInfo.city || ''} ${candidate.locationInfo.state || ''} ${candidate.locationInfo.country || ''}`
    : `${candidate.location || ''} ${candidate.preferredLocation || ''}`;

  const summary = candidate.summary || candidate.notes || '';
  const expYears = candidate.totalExperienceYears ? `${candidate.totalExperienceYears} years exp` : '';

  return `${name} ${position} ${skillsStr} ${expStr} ${eduStr} ${certsStr} ${locStr} ${summary} ${expYears} ${resumeText}`.toLowerCase();
}

/**
 * Evaluates candidate against a Boolean search query.
 */
export function evaluateBooleanSearch(candidate: any, query: string): boolean {
  if (!query || !query.trim()) return true;
  const docText = buildCandidateSearchableText(candidate);
  const tokens = tokenizeBooleanQuery(query);
  return evaluateTokens(docText, tokens);
}
