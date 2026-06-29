import { generateWithoutContext } from './groq.service';

export interface SummaryAndMapResult {
  summary: string;
  conceptMap: string;
}

/**
 * Generate document summary and a concept mindmap using LLM.
 * NOTE: We do NOT use Groq JSON mode here because the AI tends to return
 * nested objects for conceptMap, which causes Groq's strict json_validate_failed
 * errors. Instead we use a plain chat completion and extract JSON ourselves.
 */
export async function generateSummaryAndMap(text: string): Promise<SummaryAndMapResult> {
  const truncatedText = text.substring(0, 15000); // keep text within token limits

  const prompt = `Based on the following document content, generate a concise educational summary and a hierarchical concept map.

Document content:
${truncatedText}

You MUST respond with ONLY a valid JSON object. No markdown fences, no extra text — raw JSON only.
Use exactly this structure (both values must be plain strings):
{
  "summary": "A concise 2-3 paragraph summary of the document.",
  "conceptMap": "Main Topic\\n  - Subtopic 1\\n    - Detail A\\n    - Detail B\\n  - Subtopic 2\\n    - Detail C\\n  - Subtopic 3\\n    - Detail D"
}

Rules:
- "summary" must be a plain text string (no JSON inside it).
- "conceptMap" must be a single plain text string using indented bullet points (\\n and spaces for hierarchy). Do NOT use nested JSON objects or arrays for conceptMap.`;

  try {
    // Explicitly NOT using jsonMode=true to avoid Groq's strict schema validation
    const response = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      'You are an expert study guide generator. You always respond with a single valid JSON object as raw text. Never use nested JSON objects inside string values.',
      0.2,
      false  // <-- JSON mode OFF to avoid json_validate_failed errors
    );

    // Try to extract a JSON object from the response
    const raw = response.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      let parsed: any;
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        // If parse fails, fall through to fallback
        throw new Error('LLM returned malformed JSON: ' + match[0].substring(0, 200));
      }

      let conceptMapStr = 'Concept map unavailable.';
      if (parsed.conceptMap) {
        // If AI still returned an object/array despite instructions, convert it gracefully
        conceptMapStr = typeof parsed.conceptMap === 'string'
          ? parsed.conceptMap
          : convertConceptMapToString(parsed.conceptMap);
      }

      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Summary unavailable.',
        conceptMap: conceptMapStr,
      };
    }

    // If no JSON block found at all, use raw text as summary
    console.warn('Summarizer: could not find JSON in LLM response, using raw text.');
    return {
      summary: raw.substring(0, 1000) || 'Summary unavailable.',
      conceptMap: 'Concept map unavailable.',
    };
  } catch (err: any) {
    console.error('Failed to generate summary and concept map:', err);
    return {
      summary: `Summary generation failed: ${err.message || 'Unknown error'}. Please verify that the GROQ_API_KEY environment variable is correctly configured.`,
      conceptMap: `Concept map generation failed. Please check the server logs.`,
    };
  }
}

/**
 * Recursively converts a JSON concept map object/array into an indented text outline
 */
function convertConceptMapToString(conceptMap: any, depth = 0): string {
  if (typeof conceptMap === 'string') {
    return conceptMap;
  }
  
  if (typeof conceptMap !== 'object' || conceptMap === null) {
    return String(conceptMap);
  }

  const indent = '  '.repeat(depth);
  let result = '';

  if (Array.isArray(conceptMap)) {
    for (const item of conceptMap) {
      if (typeof item === 'object' && item !== null) {
        result += convertConceptMapToString(item, depth);
      } else {
        result += `${indent}- ${item}\n`;
      }
    }
  } else {
    for (const [key, value] of Object.entries(conceptMap)) {
      if (typeof value === 'object' && value !== null) {
        result += `${indent}${key}\n`;
        result += convertConceptMapToString(value, depth + 1);
      } else {
        result += `${indent}- ${key}: ${value}\n`;
      }
    }
  }

  return result;
}
