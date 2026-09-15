import { generateWithoutContext } from '../ai/groq.service';

// ─────────────────────────────────────────────────────────────────────────────
// Bloom's Revised Taxonomy Cognitive Classifier & Socratic Scaffolding Engine
//
// Academic Novelty:
//   Integrates cognitive science pedagogy directly into the RAG pipeline by
//   classifying incoming student queries into Bloom's 6 cognitive levels and
//   dynamically adapting the LLM prompt strategy:
//   - Remember / Understand  → Direct fact-grounded explanation
//   - Apply / Analyze        → Socratic step-by-step hint scaffolding
//   - Evaluate / Create      → Open-ended reflective guided inquiry
//
// Reference: Anderson, L.W. & Krathwohl, D.R. (2001). A Taxonomy for Learning,
//   Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives.
// ─────────────────────────────────────────────────────────────────────────────

export type BloomLevel =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create';

export type ScaffoldingStrategy = 'direct_explanation' | 'socratic_scaffolding' | 'reflective_inquiry';

export interface BloomClassification {
  level: BloomLevel;
  confidence: number;            // 0–1
  strategy: ScaffoldingStrategy;
  levelIndex: number;            // 1–6 for numeric analysis
  rationale: string;
  systemPromptSuffix: string;    // Appended to LLM system prompt
}

/** Numeric index for each Bloom level (used in spaced repetition weighting) */
const BLOOM_LEVEL_INDEX: Record<BloomLevel, number> = {
  Remember: 1,
  Understand: 2,
  Apply: 3,
  Analyze: 4,
  Evaluate: 5,
  Create: 6,
};

/** Maps each level to its pedagogical scaffolding strategy */
const LEVEL_STRATEGY: Record<BloomLevel, ScaffoldingStrategy> = {
  Remember: 'direct_explanation',
  Understand: 'direct_explanation',
  Apply: 'socratic_scaffolding',
  Analyze: 'socratic_scaffolding',
  Evaluate: 'reflective_inquiry',
  Create: 'reflective_inquiry',
};

/** System prompt suffix injected into the LLM based on cognitive level */
const STRATEGY_PROMPT_SUFFIX: Record<ScaffoldingStrategy, string> = {
  direct_explanation: `
PEDAGOGICAL MODE: DIRECT EXPLANATION
- The student's query is at a lower cognitive level (Remember/Understand).
- Provide a clear, accurate, and well-structured factual explanation.
- Define key terms precisely and include at least one concrete example.
- Cite the source document explicitly for each key claim.`,

  socratic_scaffolding: `
PEDAGOGICAL MODE: SOCRATIC SCAFFOLDING
- The student's query requires application or analysis-level thinking.
- Do NOT give the direct final answer immediately.
- Instead, guide the student using a structured approach:
  1. Acknowledge what they are trying to solve.
  2. Ask ONE clarifying or guiding sub-question to scaffold their thinking.
  3. Provide a partial hint or worked partial example grounded in course materials.
  4. Invite them to attempt the next step themselves.
- This promotes active learning and prevents passive answer-copying.`,

  reflective_inquiry: `
PEDAGOGICAL MODE: REFLECTIVE INQUIRY
- The student's query requires evaluation or creative thinking.
- Facilitate deep critical reflection:
  1. Present multiple perspectives or trade-offs relevant to the question.
  2. Pose an open-ended question that challenges assumptions.
  3. Encourage the student to formulate their own justified position.
  4. Reference course materials to anchor the discussion in evidence.
- Do NOT provide a single "correct" answer — foster intellectual inquiry.`,
};

/**
 * Classifies a student query into Bloom's Revised Taxonomy level using a
 * fast LLM classification pass (qwen/qwen3.6-27b gatekeeper model).
 *
 * @param query         - The student's natural language question
 * @param courseName    - Active course name for context grounding
 * @returns             BloomClassification with level, strategy, and prompt suffix
 */
export async function classifyBloomLevel(
  query: string,
  courseName: string
): Promise<BloomClassification> {
  const systemPrompt = `You are an expert educational psychologist specialising in Bloom's Revised Taxonomy. 
Classify the given student query into EXACTLY ONE of the 6 cognitive levels.

Bloom's Revised Taxonomy Levels:
1. Remember   - Recall facts, definitions, or memorised information (e.g., "What is...", "Define...", "List...")
2. Understand - Explain concepts in own words, summarise (e.g., "Explain...", "Describe...", "Summarise...")
3. Apply      - Use knowledge to solve a problem or perform a task (e.g., "How would you use...", "Solve...", "Implement...")
4. Analyze    - Break down information, find relationships (e.g., "Compare...", "Differentiate...", "Why does...")
5. Evaluate   - Make judgements, justify decisions (e.g., "Which is better...", "Critique...", "Justify...")
6. Create     - Design something new, synthesise (e.g., "Design...", "Propose...", "How would you build...")

Respond with ONLY valid JSON matching this schema exactly:
{"level": "Remember|Understand|Apply|Analyze|Evaluate|Create", "confidence": 0.0–1.0, "rationale": "one sentence"}`;

  const userPrompt = `Course: ${courseName}\nStudent Query: "${query}"`;

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      0.0,
      true // JSON mode
    );

    const parsed = JSON.parse(response.content);
    const level: BloomLevel = (parsed.level as BloomLevel) || 'Understand';
    const strategy = LEVEL_STRATEGY[level];

    return {
      level,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      strategy,
      levelIndex: BLOOM_LEVEL_INDEX[level],
      rationale: parsed.rationale || '',
      systemPromptSuffix: STRATEGY_PROMPT_SUFFIX[strategy],
    };
  } catch (err) {
    console.warn('[BloomClassifier] Classification failed, defaulting to Understand level:', err);
    return {
      level: 'Understand',
      confidence: 0.5,
      strategy: 'direct_explanation',
      levelIndex: 2,
      rationale: 'Default fallback classification.',
      systemPromptSuffix: STRATEGY_PROMPT_SUFFIX['direct_explanation'],
    };
  }
}

/**
 * Generates a Socratic scaffolding hint sequence for Apply/Analyze level queries.
 * Returns an array of progressive hint strings that can be shown to the student
 * on demand (hint 1 → hint 2 → hint 3 → partial solution).
 *
 * @param query         - The student's question
 * @param context       - Retrieved course material context
 * @param courseName    - Active course name
 * @returns             Array of 3 progressive Socratic hints
 */
export async function generateSocraticHints(
  query: string,
  context: string,
  courseName: string
): Promise<string[]> {
  const safeContext = context.substring(0, 3000);

  const systemPrompt = `You are a Socratic tutor for the ${courseName} course.
Generate exactly 3 progressive hints to guide the student toward the answer without giving it directly.
Hint 1: A guiding question that redirects attention.
Hint 2: A partial concept clarification grounded in course materials.
Hint 3: A near-complete worked partial example with one step left for the student.

Respond with ONLY a JSON array: ["hint1", "hint2", "hint3"]`;

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: `Context:\n${safeContext}\n\nStudent Question: ${query}` }],
      systemPrompt,
      0.3,
      true
    );

    const hints = JSON.parse(response.content);
    if (Array.isArray(hints) && hints.length >= 3) return hints.slice(0, 3);
    return ['Think about the core concept.', 'Refer to the relevant section in your notes.', 'Try working through a simple example first.'];
  } catch (err) {
    return ['Think about the core concept.', 'Refer to the relevant section in your notes.', 'Try working through a simple example first.'];
  }
}
