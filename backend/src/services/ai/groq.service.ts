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

const SYSTEM_PROMPT = `You are EduMentor AI, an expert educational assistant for higher education students. 
You provide clear, accurate, and pedagogically sound explanations based on the provided course materials.
Always:
- Be precise and factual, citing concepts from the provided context
- Use simple language appropriate for university students
- Structure your answers with clear formatting when helpful
- Admit when something is outside the scope of the provided materials
- Encourage deeper learning by suggesting related topics when appropriate`;

export async function generateResponse(
  messages: LLMMessage[],
  context: string,
  temperature = 0.3
): Promise<LLMResponse> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please configure it in your server environment variables.');
  }

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\n--- COURSE MATERIAL CONTEXT ---\n${context}\n--- END CONTEXT ---\n\nBase your answer primarily on the above context. If the context doesn't contain enough information, say so clearly.`,
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
  temperature = 0.3
): Promise<{ model: string }> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is missing. Please configure it in your server environment variables.');
  }

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\n--- COURSE MATERIAL CONTEXT ---\n${context}\n--- END CONTEXT ---\n\nBase your answer primarily on the above context. If the context doesn't contain enough information, say so clearly.`,
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
