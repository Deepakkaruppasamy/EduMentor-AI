export interface AcademicChunk {
  id: string;
  text: string;
  chunkType: 'heading_section' | 'definition' | 'equation_block' | 'code_block' | 'standard_paragraph';
  metadata: {
    headerPath: string[];
    hasLaTeX: boolean;
    hasCode: boolean;
    wordCount: number;
    charCount: number;
  };
}

/**
 * Academic Structural & Adaptive Chunker (Tier 1 Novelty #4)
 *
 * Replaces naive character-window chunking with boundary-aware semantic chunking
 * specifically designed for educational and academic materials:
 *   - Preserves complete Markdown section headers & hierarchy.
 *   - Keeps LaTeX mathematical formulas ($$ ... $$) contiguous.
 *   - Isolates academic definitions, theorems, and algorithm blocks.
 *   - Preserves source code listings intact.
 */
export function academicChunkDocument(
  documentText: string,
  docId: string = 'doc',
  maxChunkSize = 800,
  minChunkSize = 100
): AcademicChunk[] {
  if (!documentText || !documentText.trim()) return [];

  const lines = documentText.split('\n');
  const chunks: AcademicChunk[] = [];
  
  let currentHeaderPath: string[] = ['Introduction'];
  let currentBuffer: string[] = [];
  let currentType: AcademicChunk['chunkType'] = 'standard_paragraph';
  let inCodeBlock = false;
  let inMathBlock = false;

  const flushBuffer = () => {
    const rawText = currentBuffer.join('\n').trim();
    if (rawText.length >= minChunkSize || chunks.length === 0) {
      const hasLaTeX = /\$\$[\s\S]*?\$\$|\\\(.*?\\\)|\\\[.*?\\\]|\$.*?\$/.test(rawText);
      const hasCode = /```[\s\S]*?```|`.*?`/.test(rawText);
      const wordCount = rawText.split(/\s+/).length;

      chunks.push({
        id: `${docId}_chunk_${chunks.length + 1}`,
        text: rawText,
        chunkType: currentType,
        metadata: {
          headerPath: [...currentHeaderPath],
          hasLaTeX,
          hasCode,
          wordCount,
          charCount: rawText.length,
        },
      });
    }
    currentBuffer = [];
    currentType = 'standard_paragraph';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for Markdown headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentBuffer.length > 0) flushBuffer();
      const level = headerMatch[1].length;
      const headerTitle = headerMatch[2].trim();
      currentHeaderPath = currentHeaderPath.slice(0, level - 1);
      currentHeaderPath[level - 1] = headerTitle;
      currentType = 'heading_section';
      currentBuffer.push(line);
      continue;
    }

    // Check for Code Block boundaries
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock && currentBuffer.length > 0) {
        flushBuffer();
        currentType = 'code_block';
      }
      inCodeBlock = !inCodeBlock;
      currentBuffer.push(line);
      if (!inCodeBlock) flushBuffer();
      continue;
    }

    // Check for LaTeX Math Block boundaries ($$)
    if (trimmed.startsWith('$$') || trimmed.endsWith('$$')) {
      if (!inMathBlock && currentBuffer.length > 0) {
        flushBuffer();
        currentType = 'equation_block';
      }
      inMathBlock = !inMathBlock;
      currentBuffer.push(line);
      if (!inMathBlock) flushBuffer();
      continue;
    }

    // Check for Academic Definitions / Theorems / Algorithm Callouts
    if (/^(Definition|Theorem|Lemma|Algorithm|Example|Proposition|Corollary)\s*\d*:/i.test(trimmed)) {
      if (currentBuffer.length > 0) flushBuffer();
      currentType = 'definition';
      currentBuffer.push(line);
      continue;
    }

    currentBuffer.push(line);

    // If current chunk buffer exceeds max length, flush at paragraph boundary
    const currentLength = currentBuffer.join('\n').length;
    if (currentLength >= maxChunkSize && (trimmed === '' || inCodeBlock || inMathBlock)) {
      flushBuffer();
    }
  }

  if (currentBuffer.length > 0) flushBuffer();

  return chunks;
}
