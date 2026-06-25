import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { config } from '../config/env';
import { generateEmbedding, generateEmbeddings } from './embeddings';

let chromaClient: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!chromaClient) {
    chromaClient = new ChromaClient({ path: config.CHROMA_URL });
  }
  return chromaClient;
}

export async function getOrCreateCollection(collectionName: string): Promise<Collection> {
  const client = getChromaClient();
  try {
    return await client.getOrCreateCollection({
      name: collectionName,
      metadata: { description: `EduMentor course collection: ${collectionName}` },
    });
  } catch (error) {
    console.error(`Failed to get/create collection ${collectionName}:`, error);
    throw error;
  }
}

export async function addDocumentsToCollection(
  collectionName: string,
  documents: { id: string; text: string; metadata: Record<string, any> }[]
): Promise<void> {
  const collection = await getOrCreateCollection(collectionName);

  const ids = documents.map((d) => d.id);
  const texts = documents.map((d) => d.text);
  const metadatas = documents.map((d) => d.metadata);

  // Generate embeddings in batch
  const embeddings = await generateEmbeddings(texts);

  await collection.add({
    ids,
    documents: texts,
    metadatas,
    embeddings,
  });
}

export interface VectorSearchResult {
  id: string;
  document: string;
  metadata: Record<string, any>;
  distance: number;
  score: number;
}

export async function vectorSearch(
  collectionName: string,
  query: string,
  nResults = 10
): Promise<VectorSearchResult[]> {
  try {
    const collection = await getOrCreateCollection(collectionName);
    const queryEmbedding = await generateEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
      include: ['documents', 'metadatas', 'distances'] as any,
    });

    if (!results.documents || !results.documents[0]) return [];

    return results.documents[0].map((doc, i) => ({
      id: results.ids[0][i],
      document: doc || '',
      metadata: (results.metadatas?.[0]?.[i] as Record<string, any>) || {},
      distance: results.distances?.[0]?.[i] || 1,
      score: 1 - (results.distances?.[0]?.[i] || 1),
    }));
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}

export async function deleteCollection(collectionName: string): Promise<void> {
  const client = getChromaClient();
  try {
    await client.deleteCollection({ name: collectionName });
  } catch (error) {
    console.warn(`Could not delete collection ${collectionName}:`, error);
  }
}
