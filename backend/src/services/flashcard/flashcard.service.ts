import { generateWithoutContext } from '../ai/groq.service';
import { IFlashcard } from '../../models/FlashcardDeck';

/**
 * Generate active recall flashcards from course context
 */
export async function generateFlashcards(
  topic: string,
  courseName: string,
  context: string,
  count = 8
): Promise<IFlashcard[]> {
  const prompt = `You are an expert ${courseName} professor. Generate exactly ${count} active recall study flashcards for the topic "${topic}".
  
Use the following course material context:
${context}

Return ONLY a valid JSON object matching this structure:
{
  "cards": [
    {
      "front": "Concise active recall question or prompt?",
      "back": "Clear and detailed answer based on course materials..."
    }
  ]
}

Rules:
- The 'front' should be a question, a definition prompt, or a fill-in-the-blank query.
- The 'back' should contain a clean, accurate explanation.
- Rely on the provided context for accurate content.
- Return ONLY the JSON object, no introductory or trailing text.`;

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      'You are a study flashcard generator. Always respond with valid JSON only.',
      0.5,
      true
    );

    const match = response.content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.cards && Array.isArray(parsed.cards)) {
        return parsed.cards.slice(0, count);
      }
    }
  } catch (err) {
    console.error('Failed to generate flashcards:', err);
  }

  return [];
}
