import Groq from 'groq-sdk';
import { config } from '../../config/env';
import fs from 'fs';

const groq = new Groq({ apiKey: config.GROQ_API_KEY });
const LLM_MODEL = 'llama-3.3-70b-versatile';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

const BASE_SYSTEM_PROMPT = `You are EduMentor AI, an expert educational assistant for higher education students. 
You provide clear, accurate, and pedagogically sound explanations based on the provided course materials.
Always:
- Be precise and factual, citing concepts from the provided context
- Use simple language appropriate for university students
- Structure your answers with clear formatting when helpful
- Admit when something is outside the scope of the provided materials
- Encourage deeper learning by suggesting related topics when appropriate`;

// Keep SYSTEM_PROMPT as an alias for backward compatibility (used by generateWithoutContext)
const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;

function buildCourseSystemPrompt(courseName: string, languagePrompt: string, context: string): string {
  return `${BASE_SYSTEM_PROMPT}

🎓 ACTIVE COURSE: "${courseName}"

CRITICAL SUBJECT SCOPE RULE:
You are currently acting as the AI tutor EXCLUSIVELY for the "${courseName}" course.
- You MUST ONLY answer questions that are directly related to the subject matter of "${courseName}".
- If a student asks a question that is NOT related to "${courseName}", you MUST politely decline and remind them that you can only help with "${courseName}" topics in this session.
- Do NOT answer general knowledge questions, questions about other subjects, personal questions, or anything outside the scope of "${courseName}".
- When declining, use this format: "I'm your AI tutor for the **${courseName}** course. Your question appears to be outside this subject's scope. Please ask questions related to ${courseName} topics."
${languagePrompt}

--- COURSE MATERIAL CONTEXT ---
${context}
--- END CONTEXT ---

Base your answer primarily on the above context. If the context doesn't contain enough information about a ${courseName} topic, say so clearly.`;
}

export async function generateResponse(
  messages: LLMMessage[],
  context: string,
  temperature = 0.3,
  preferredLanguage = 'English',
  courseName?: string
): Promise<LLMResponse> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please configure it in your server environment variables.');
  }

  const languagePrompt = preferredLanguage && preferredLanguage.toLowerCase() !== 'english'
    ? `\n- IMPORTANT: You MUST answer the user's question and explain all concepts natively in ${preferredLanguage}. Make the translation natural and preserve all academic definitions.`
    : '';

  const systemContent = courseName
    ? buildCourseSystemPrompt(courseName, languagePrompt, context)
    : `${BASE_SYSTEM_PROMPT}${languagePrompt}\n\n--- COURSE MATERIAL CONTEXT ---\n${context}\n--- END CONTEXT ---\n\nBase your answer primarily on the above context. If the context doesn't contain enough information, say so clearly.`;

  const systemMessage: LLMMessage = {
    role: 'system',
    content: systemContent,
  };

  const allMessages = [systemMessage, ...messages];

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: allMessages as any,
    temperature,
    max_tokens: 2048,
    top_p: 0.9,
  });

  const choice = completion.choices[0];
  return {
    content: choice.message.content || '',
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
    model: completion.model || LLM_MODEL,
  };
}

export async function generateWithoutContext(
  messages: LLMMessage[],
  systemOverride?: string,
  temperature = 0.5,
  jsonMode = false
): Promise<LLMResponse> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please configure it in your server environment variables.');
  }

  const systemMessage: LLMMessage = {
    role: 'system',
    content: systemOverride || SYSTEM_PROMPT,
  };

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [systemMessage, ...messages] as any,
    temperature,
    max_tokens: 4096,
    top_p: 0.9,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  });

  const choice = completion.choices[0];
  return {
    content: choice.message.content || '',
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
    model: completion.model || LLM_MODEL,
  };
}

export async function generateResponseStream(
  messages: LLMMessage[],
  context: string,
  onToken: (token: string) => void,
  temperature = 0.3,
  preferredLanguage = 'English',
  courseName?: string
): Promise<{ model: string }> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please configure it in your server environment variables.');
  }

  const languagePrompt = preferredLanguage && preferredLanguage.toLowerCase() !== 'english'
    ? `\n- IMPORTANT: You MUST answer the user's question and explain all concepts natively in ${preferredLanguage}. Make the translation natural and preserve all academic definitions.`
    : '';

  const systemContent = courseName
    ? buildCourseSystemPrompt(courseName, languagePrompt, context)
    : `${BASE_SYSTEM_PROMPT}${languagePrompt}\n\n--- COURSE MATERIAL CONTEXT ---\n${context}\n--- END CONTEXT ---\n\nBase your answer primarily on the above context. If the context doesn't contain enough information, say so clearly.`;

  const systemMessage: LLMMessage = {
    role: 'system',
    content: systemContent,
  };

  const allMessages = [systemMessage, ...messages];

  const stream = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: allMessages as any,
    temperature,
    max_tokens: 2048,
    top_p: 0.9,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      onToken(token);
    }
  }

  return {
    model: LLM_MODEL,
  };
}

/**
 * Lightweight check: uses a fast LLM call to determine if a question
 * is relevant to the specified course/subject.
 * Returns true if relevant, false if off-topic.
 */
export async function isQuestionRelevantToCourse(
  question: string,
  courseName: string,
  courseDescription?: string
): Promise<{ relevant: boolean; reason: string }> {
  if (!config.GROQ_API_KEY) {
    // Fail open — let the main prompt handle it
    return { relevant: true, reason: 'API key not configured, skipping relevance check.' };
  }

  const descriptionHint = courseDescription
    ? `\nCourse Description: ${courseDescription}`
    : '';

  const systemPrompt = `You are a strict academic subject classifier. Your ONLY job is to determine if a student's question is relevant to the specified university course. Respond with ONLY a valid JSON object — no extra text.`;

  const userPrompt = `Course Name: ${courseName}${descriptionHint}

Student Question: "${question}"

Is this question relevant to the course "${courseName}"? A question is relevant if it relates to the topics, concepts, theories, methods, tools, or subject matter taught in this course.

Respond with ONLY this JSON format:
{"relevant": true/false, "reason": "one sentence explanation"}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Use a faster, smaller model for this check
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ] as any,
      temperature: 0.0,
      max_tokens: 100,
      top_p: 1,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    return {
      relevant: parsed.relevant === true,
      reason: parsed.reason || 'No reason provided.',
    };
  } catch (err) {
    console.warn('Subject relevance check failed, failing open:', err);
    return { relevant: true, reason: 'Relevance check failed, proceeding.' };
  }
}

export async function transcribeAudioFile(filePath: string): Promise<string> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please configure it in your server environment variables.');
  }

  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-large-v3',
  });

  return transcription.text || '';
}

export async function structureTranscript(rawText: string): Promise<string> {
  const messages: LLMMessage[] = [
    {
      role: 'user',
      content: `The following is a raw lecture transcription. Please structure and format it into a comprehensive, high-quality study guide / lecture notes in Markdown.
- Add clear headings and subheadings.
- Organize the concepts logically with bullet points and bold text for key terms.
- Clean up filler words (like "um", "ah", "you know") and correct any obvious speech-to-text typos.
- Add a "Key Takeaways" or summary section at the end.
- Do NOT lose any pedagogical/educational details; keep all explanations, formulas, definitions, and examples intact.

Raw Transcript:
${rawText}`
    }
  ];

  const response = await generateWithoutContext(
    messages,
    'You are an expert curriculum designer and academic editor. Your job is to format raw voice transcripts into beautiful, comprehensive, and highly readable lecture notes.',
    0.3
  );

  return response.content;
}

export interface ConceptNode {
  concept: string;
  children?: ConceptNode[];
}

export async function extractConceptGraph(
  question: string,
  answer: string
): Promise<ConceptNode> {
  const systemPrompt = `You are an educational assistant that extracts hierarchical concept maps from academic questions and explanations.
Generate a hierarchical concept graph that relates the key concepts discussed in the user's question and the provided answer.
Format the output as a JSON object matching this schema:
{
  "concept": "string (the main root concept)",
  "children": [
    {
      "concept": "string (sub-concept 1)",
      "children": [
        {
          "concept": "string (sub-sub-concept)",
          "children": []
        }
      ]
    }
  ]
}

Ensure:
- The graph is highly relevant to the topics of the question and answer.
- The depth of the tree is between 2 and 3 levels.
- The children list has between 2 and 5 elements per node.
- Respond ONLY with the JSON object, no introductory or trailing text.`;

  const messages: LLMMessage[] = [
    {
      role: 'user',
      content: `Question: ${question}\n\nAnswer: ${answer}`
    }
  ];

  try {
    const response = await generateWithoutContext(
      messages,
      systemPrompt,
      0.2,
      true // JSON Mode
    );
    return JSON.parse(response.content) as ConceptNode;
  } catch (err) {
    console.error('Failed to extract concept graph:', err);
    return {
      concept: "Key Concepts",
      children: [
        { concept: "Core Topic", children: [] },
        { concept: "Explanation Details", children: [] }
      ]
    };
  }
}
