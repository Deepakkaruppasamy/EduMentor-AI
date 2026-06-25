import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import Document from '../models/Document';
import Course from '../models/Course';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { extractText, chunkText, cleanText } from '../utils/document-processor';
import { addDocumentsToCollection } from '../utils/chroma';
import { indexDocumentsForBM25 } from '../services/rag/bm25-search.service';
import { generateEmbeddings } from '../utils/embeddings';
import { v4 as uuidv4 } from 'uuid';
import { generateSummaryAndMap } from '../services/ai/summarizer.service';

export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  const fileExt = path.extname(req.file.originalname).replace('.', '').toLowerCase();

  // Create document record
  const doc = await Document.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileType: fileExt,
    filePath: req.file.path,
    fileSize: req.file.size,
    course: courseId,
    uploadedBy: req.user?._id,
    processingStatus: 'processing',
  });

  // Add to course
  await Course.findByIdAndUpdate(courseId, { $push: { documents: doc._id } });

  // Process document asynchronously
  processDocumentAsync(doc._id.toString(), req.file.path, fileExt, course.chromaCollection, doc.originalName);

  res.status(201).json({
    success: true,
    message: 'Document uploaded and processing started',
    document: doc,
  });
});

async function processDocumentAsync(
  docId: string,
  filePath: string,
  fileType: string,
  collectionName: string,
  docName: string
): Promise<void> {
  try {
    // Extract text
    const extracted = await extractText(filePath, fileType);
    const cleanedText = cleanText(extracted.text);

    // Chunk text
    const chunks = chunkText(cleanedText, 512, 50);

    if (chunks.length === 0) {
      await Document.findByIdAndUpdate(docId, {
        processingStatus: 'failed',
        processingError: 'No text could be extracted from document',
      });
      return;
    }

    // Add to ChromaDB
    const chromaDocs = chunks.map((chunk) => ({
      id: `${docId}_chunk_${chunk.index}`,
      text: chunk.text,
      metadata: {
        documentId: docId,
        documentName: docName,
        chunkIndex: chunk.index,
        pageNumber: chunk.pageNumber || 1,
      },
    }));

    await addDocumentsToCollection(collectionName, chromaDocs);

    // Update BM25 index
    const existingDocs = await Document.find({ processingStatus: 'completed' });
    const allChunks: { id: string; text: string; metadata: Record<string, any> }[] = [];
    for (const existDoc of existingDocs) {
      const chunksList = existDoc.chunks || [];
      for (const chunk of chunksList) {
        allChunks.push({
          id: `${existDoc._id}_chunk_${chunk.index}`,
          text: chunk.text,
          metadata: { documentId: existDoc._id, documentName: existDoc.originalName, pageNumber: chunk.pageNumber },
        });
      }
    }
    // Add new chunks
    for (const chunk of chunks) {
      allChunks.push({
        id: `${docId}_chunk_${chunk.index}`,
        text: chunk.text,
        metadata: { documentId: docId, documentName: docName, pageNumber: chunk.pageNumber },
      });
    }
    indexDocumentsForBM25(collectionName, allChunks);

    // Generate AI Summary and Concept map
    const studyGuide = await generateSummaryAndMap(cleanedText);

    // Update document record
    await Document.findByIdAndUpdate(docId, {
      chunks: chunks.map((c) => ({
        index: c.index,
        text: c.text,
        pageNumber: c.pageNumber,
        chromaId: `${docId}_chunk_${c.index}`,
      })),
      totalChunks: chunks.length,
      summary: studyGuide.summary,
      conceptMap: studyGuide.conceptMap,
      processingStatus: 'completed',
    });

    console.log(`✅ Document ${docName} processed: ${chunks.length} chunks`);
  } catch (error: any) {
    console.error('Document processing failed:', error);
    await Document.findByIdAndUpdate(docId, {
      processingStatus: 'failed',
      processingError: error.message,
    });
  }
}

export const getDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.query;
  const filter: any = {};
  if (courseId) filter.course = courseId;

  const documents = await Document.find(filter)
    .populate('course', 'title code')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 })
    .select('-chunks');

  res.json({ success: true, count: documents.length, documents });
});

export const deleteDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Remove file
  if (fs.existsSync(doc.filePath)) {
    fs.unlinkSync(doc.filePath);
  }

  await Document.findByIdAndDelete(req.params.id);
  await Course.findByIdAndUpdate(doc.course, { $pull: { documents: doc._id } });

  res.json({ success: true, message: 'Document deleted' });
});
