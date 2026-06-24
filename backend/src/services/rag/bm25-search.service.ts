import natural from 'natural';

const { TfIdf } = natural;

export interface BM25Result {
  id: string;
  text: string;
  metadata: Record<string, any>;
  score: number;
}

export interface IndexedDocument {
  id: string;
  text: string;
  metadata: Record<string, any>;
}

/**
 * BM25 search implementation using TF-IDF from the `natural` library
 * Operates over an in-memory corpus of document chunks for a given course
 */
export class BM25Index {
  private tfidf: natural.TfIdf;
  private documents: IndexedDocument[];
  private tokenizer: natural.WordTokenizer;

  constructor() {
    this.tfidf = new TfIdf();
    this.documents = [];
    this.tokenizer = new natural.WordTokenizer();
  }

  /**
   * Add documents to the BM25 index
   */
  addDocuments(docs: IndexedDocument[]): void {
    this.documents = docs;
    this.tfidf = new TfIdf();
    for (const doc of docs) {
      this.tfidf.addDocument(doc.text);
    }
  }

  /**
   * Search the BM25 index for a query
   */
  search(query: string, nResults = 10): BM25Result[] {
    if (this.documents.length === 0) return [];

    const queryTokens = this.tokenizer.tokenize(query.toLowerCase()) || [];
    const scores: { index: number; score: number }[] = [];

    // Score each document
    this.documents.forEach((_, docIndex) => {
      let totalScore = 0;
      for (const term of queryTokens) {
        const measure = this.tfidf.tfidf(term, docIndex);
        totalScore += measure;
      }
      if (totalScore > 0) {
        scores.push({ index: docIndex, score: totalScore });
      }
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Get top N results
    return scores.slice(0, nResults).map(({ index, score }) => ({
      id: this.documents[index].id,
      text: this.documents[index].text,
      metadata: this.documents[index].metadata,
      score,
    }));
  }
}

// In-memory BM25 indexes per course collection
const courseIndexes = new Map<string, BM25Index>();

export function getBM25Index(collectionName: string): BM25Index {
  if (!courseIndexes.has(collectionName)) {
    courseIndexes.set(collectionName, new BM25Index());
  }
  return courseIndexes.get(collectionName)!;
}

export function indexDocumentsForBM25(
  collectionName: string,
  documents: IndexedDocument[]
): void {
  const index = getBM25Index(collectionName);
  index.addDocuments(documents);
}
