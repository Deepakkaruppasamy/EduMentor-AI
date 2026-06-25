import Document from '../../models/Document';
import Course from '../../models/Course';
import { getOrCreateCollection } from '../../utils/chroma';
import { generateEmbeddings } from '../../utils/embeddings';
import { indexDocumentsForBM25 } from './bm25-search.service';

/**
 * Re-index all completed documents from MongoDB into ChromaDB and BM25 on server boot.
 * This resolves the issue of data loss during server restarts or Render redeployments
 * (since ChromaDB runs on ephemeral storage and BM25 index is in-memory).
 */
export async function initializeIndices(): Promise<void> {
  console.log('🔄 Re-indexing completed documents on boot...');
  try {
    const completedDocs = await Document.find({ processingStatus: 'completed' });
    if (completedDocs.length === 0) {
      console.log('ℹ️ No completed documents to index.');
      return;
    }

    // Group document chunks by course chromaCollection
    const courseGroups = new Map<string, { chunks: any[] }>();

    for (const doc of completedDocs) {
      // Find course details to get the chromaCollection name
      const course = await Course.findById(doc.course);
      if (!course || !course.chromaCollection) continue;

      const groupKey = course.chromaCollection;
      if (!courseGroups.has(groupKey)) {
        courseGroups.set(groupKey, { chunks: [] });
      }

      const group = courseGroups.get(groupKey)!;
      const chunksList = doc.chunks || [];
      
      for (const chunk of chunksList) {
        group.chunks.push({
          id: chunk.chromaId || `${doc._id}_chunk_${chunk.index}`,
          text: chunk.text,
          metadata: {
            documentId: doc._id.toString(),
            documentName: doc.originalName,
            chunkIndex: chunk.index,
            pageNumber: chunk.pageNumber || 1,
          },
        });
      }
    }

    // Synchronize indices for each course collection
    for (const [collectionName, data] of courseGroups.entries()) {
      if (data.chunks.length === 0) continue;

      console.log(`📦 Re-indexing collection: ${collectionName} with ${data.chunks.length} chunks...`);

      // 1. Populate BM25 index in memory
      indexDocumentsForBM25(collectionName, data.chunks);

      // 2. Sync to ChromaDB
      const collection = await getOrCreateCollection(collectionName);
      const texts = data.chunks.map(c => c.text);
      const embeddings = await generateEmbeddings(texts);

      // Use upsert to avoid duplicate errors if some indexes already exist
      await collection.upsert({
        ids: data.chunks.map(c => c.id),
        documents: texts,
        metadatas: data.chunks.map(c => c.metadata),
        embeddings,
      });

      console.log(`✅ Collection "${collectionName}" successfully re-indexed.`);
    }

    console.log('⚙️ All document indices synchronized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize document indices on boot:', err);
  }
}
