import { generateWithoutContext } from './groq.service';

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text || text.trim() === '') return '';
  const src = sourceLang.trim().toLowerCase();
  const tgt = targetLang.trim().toLowerCase();
  
  if (src === tgt) return text;
  if ((src === 'en' || src === 'english') && (tgt === 'en' || tgt === 'english')) return text;

  const systemPrompt = `You are a high-quality academic translator. Translate the text from ${sourceLang} to ${targetLang}.
Keep technical terms (like DBMS, SQL, API, Machine Learning, Normalization, Joins, CSS, etc.) in English or their accepted standard form unless a direct standard translation exists.
Return ONLY the direct translation. Do not add any conversational text, explanations, notes, or markdown formatting outside the translation.`;

  const response = await generateWithoutContext(
    [{ role: 'user', content: `Translate this text:\n\n${text}` }],
    systemPrompt,
    0.1
  );

  return response.content.trim();
}
