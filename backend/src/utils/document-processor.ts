import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedContent {
  text: string;
  pages?: number;
  metadata?: Record<string, any>;
}

export interface TextChunk {
  index: number;
  text: string;
  pageNumber?: number;
  wordCount: number;
}

/**
 * Extract text from PDF, DOCX, PPTX, or TXT files
 */
export async function extractText(filePath: string, fileType: string): Promise<ExtractedContent> {
  const absPath = path.resolve(filePath);

  switch (fileType.toLowerCase()) {
    case 'pdf':
      return extractFromPDF(absPath);
    case 'docx':
    case 'doc':
      return extractFromDOCX(absPath);
    case 'txt':
      return extractFromTXT(absPath);
    case 'pptx':
      return extractFromPPTX(absPath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractFromPDF(filePath: string): Promise<ExtractedContent> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return {
    text: data.text,
    pages: data.numpages,
    metadata: { info: data.info },
  };
}

async function extractFromDOCX(filePath: string): Promise<ExtractedContent> {
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    text: result.value,
    metadata: { messages: result.messages },
  };
}

async function extractFromTXT(filePath: string): Promise<ExtractedContent> {
  const text = fs.readFileSync(filePath, 'utf-8');
  return { text };
}

async function extractFromPPTX(filePath: string): Promise<ExtractedContent> {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>;
    let text = '';

    for (const entry of entries) {
      if (entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')) {
        const content = entry.getData().toString('utf8');
        const matches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const slideText = matches.map((m: string) => m.replace(/<[^>]*>/g, '')).join(' ');
        text += slideText + '\n\n';
      }
    }

    return { text: text.trim() || 'No text found in PPTX slides.' };
  } catch {
    return { text: 'PPTX content could not be extracted. Please convert to PDF and re-upload.' };
  }
}

/**
 * Chunk text into overlapping segments for RAG
 */
export function chunkText(
  text: string,
  chunkSize = 512,
  overlap = 50
): TextChunk[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks: TextChunk[] = [];
  let index = 0;

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length === 0) break;

    const chunkText = chunkWords.join(' ');
    // Estimate page number (approx 250 words per page)
    const pageNumber = Math.floor(i / 250) + 1;

    chunks.push({
      index: index++,
      text: chunkText,
      pageNumber,
      wordCount: chunkWords.length,
    });

    if (chunkWords.length < chunkSize) break;
  }

  return chunks;
}

/**
 * Clean extracted text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .trim();
}
