import { generateWithoutContext } from './groq.service';

export interface SummaryAndMapResult {
  summary: string;
  conceptMap: string;
}

/**
 * Generate document summary and a concept mindmap using LLM (Groq JSON mode)
 */
export async function generateSummaryAndMap(text: string): Promise<SummaryAndMapResult> {
  const truncatedText = text.substring(0, 15000); // keep text within token limits

  const prompt = `Based on the following document content, generate a concise educational summary and a concept map.
  
Document content:
${truncatedText}

Return ONLY a valid JSON object matching this structure:
{
  "summary": "Concise summary of the document (2-3 paragraphs)...",
  "conceptMap": "Hierarchical mind-map outline using bullet points or simple nested text to represent key concepts and their relationships..."
}`;

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      'You are an expert study guide generator. Always respond with valid JSON only.',
      0.3,
      true
    );

    const match = response.content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        summary: parsed.summary || 'Summary unavailable.',
        conceptMap: parsed.conceptMap || 'Concept map unavailable.',
      };
    }
  } catch (err: any) {
    console.error('Failed to generate summary and concept map:', err);
    return {
      summary: `Summary generation failed: ${err.message || 'Unknown error'}. Please verify that the GROQ_API_KEY environment variable is correctly configured in your server dashboard.`,
      conceptMap: `Concept map generation failed. Please check the server logs and verify your GROQ_API_KEY.`
    };
  }

  return {
    summary: 'Summary generation failed. Please check the server configuration and verify your GROQ_API_KEY.',
    conceptMap: 'Concept map generation failed. Please check the server configuration and verify your GROQ_API_KEY.',
  };
}
