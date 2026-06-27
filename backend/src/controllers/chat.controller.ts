import { Response } from 'express';
import Chat from '../models/Chat';
import Course from '../models/Course';
import Analytics from '../models/Analytics';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { generateResponse, generateResponseStream, extractConceptGraph } from '../services/ai/groq.service';
import { detectHallucination } from '../services/hallucination/hallucination.service';
import { buildExplainableResult } from '../services/explainability/explainability.service';
import { trackStudentQuery } from '../services/recommendations/recommendation.service';

export const queryChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { question, courseId, chatId } = req.body;
  const startTime = Date.now();

  if (!question || !courseId) {
    return res.status(400).json({ success: false, message: 'Question and courseId are required' });
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  // 1. Hybrid RAG retrieval
  const ragResult = await hybridRetrieve(question, course.chromaCollection);

  // 2. Build chat history for context
  let chat = chatId ? await Chat.findById(chatId) : null;
  if (!chat) {
    chat = new Chat({
      user: req.user?._id,
      course: courseId,
      title: question.substring(0, 50),
      messages: [],
    });
  }

  const recentHistory = chat.messages.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  recentHistory.push({ role: 'user', content: question });

  // 3. Generate LLM response
  const llmResponse = await generateResponse(recentHistory, ragResult.context);

  // 4. Hallucination detection
  const chunkTexts = ragResult.chunks.map((c) => c.text);
  const hallucinationResult = await detectHallucination(llmResponse.content, chunkTexts);

  // 5. Explainable AI
  const explainableResult = buildExplainableResult(
    llmResponse.content,
    ragResult.chunks,
    ragResult.retrievalMethod
  );

  // 5.5. Extract concept map
  const conceptGraph = await extractConceptGraph(question, llmResponse.content);

  // 6. Save chat messages
  chat.messages.push({
    role: 'user',
    content: question,
    timestamp: new Date(),
  });
  chat.messages.push({
    role: 'assistant',
    content: llmResponse.content,
    sources: ragResult.chunks.map((c) => ({
      documentId: c.documentId as any,
      documentName: c.documentName,
      chunkText: c.text.substring(0, 200),
      pageNumber: c.pageNumber,
      score: c.finalScore,
    })),
    trustScore: hallucinationResult.trustScore,
    confidenceScore: explainableResult.overallConfidence,
    hallucinationFlags: hallucinationResult.hallucinatedSentences,
    conceptGraph,
    timestamp: new Date(),
  });
  chat.totalMessages = chat.messages.length;
  await chat.save();

  // 7. Track for recommendations
  const topics = ragResult.chunks
    .map((c) => c.metadata?.topic || '')
    .filter(Boolean)
    .slice(0, 3);
  await trackStudentQuery(req.user!._id.toString(), courseId, question, topics);

  // 8. Update analytics
  const responseTime = Date.now() - startTime;
  await updateDailyAnalytics(hallucinationResult.trustScore, responseTime, courseId);

  res.json({
    success: true,
    chatId: chat._id,
    answer: llmResponse.content,
    conceptGraph,
    hallucination: {
      trustScore: hallucinationResult.trustScore,
      status: hallucinationResult.status,
      verdict: hallucinationResult.verdict,
      flags: hallucinationResult.hallucinatedSentences,
    },
    explainability: {
      sources: explainableResult.sources,
      overallConfidence: explainableResult.overallConfidence,
      retrievalMethod: explainableResult.retrievalMethod,
      explanationSummary: explainableResult.explanationSummary,
    },
    usage: llmResponse.usage,
  });
});

export const queryChatStream = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { question, courseId, chatId } = req.body;
  const startTime = Date.now();

  if (!question || !courseId) {
    return res.status(400).json({ success: false, message: 'Question and courseId are required' });
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  // 1. Hybrid RAG retrieval
  const ragResult = await hybridRetrieve(question, course.chromaCollection);

  // 2. Build chat history for context
  let chat = chatId ? await Chat.findById(chatId) : null;
  if (!chat) {
    chat = new Chat({
      user: req.user?._id,
      course: courseId,
      title: question.substring(0, 50),
      messages: [],
    });
  }

  const recentHistory = chat.messages.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  recentHistory.push({ role: 'user', content: question });

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Stream generated response
  let fullAnswerText = '';
  const onToken = (token: string) => {
    fullAnswerText += token;
    res.write(`data: ${JSON.stringify({ type: 'token', text: token })}\n\n`);
  };

  try {
    await generateResponseStream(recentHistory, ragResult.context, onToken);

    // 4. Hallucination detection
    const chunkTexts = ragResult.chunks.map((c) => c.text);
    const hallucinationResult = await detectHallucination(fullAnswerText, chunkTexts);

    // 5. Explainable AI
    const explainableResult = buildExplainableResult(
      fullAnswerText,
      ragResult.chunks,
      ragResult.retrievalMethod
    );

    // 5.5. Extract concept map
    const conceptGraph = await extractConceptGraph(question, fullAnswerText);

    // 6. Save chat messages
    chat.messages.push({
      role: 'user',
      content: question,
      timestamp: new Date(),
    });
    chat.messages.push({
      role: 'assistant',
      content: fullAnswerText,
      sources: ragResult.chunks.map((c) => ({
        documentId: c.documentId as any,
        documentName: c.documentName,
        chunkText: c.text.substring(0, 200),
        pageNumber: c.pageNumber,
        score: c.finalScore,
      })),
      trustScore: hallucinationResult.trustScore,
      confidenceScore: explainableResult.overallConfidence,
      hallucinationFlags: hallucinationResult.hallucinatedSentences,
      conceptGraph,
      timestamp: new Date(),
    });
    chat.totalMessages = chat.messages.length;
    await chat.save();

    // 7. Track for recommendations
    const topics = ragResult.chunks
      .map((c) => c.metadata?.topic || '')
      .filter(Boolean)
      .slice(0, 3);
    await trackStudentQuery(req.user!._id.toString(), courseId, question, topics);

    // 8. Update analytics
    const responseTime = Date.now() - startTime;
    await updateDailyAnalytics(hallucinationResult.trustScore, responseTime, courseId);

    // Send final analysis payload
    const finalPayload = {
      type: 'done',
      chatId: chat._id,
      conceptGraph,
      hallucination: {
        trustScore: hallucinationResult.trustScore,
        status: hallucinationResult.status,
        verdict: hallucinationResult.verdict,
        flags: hallucinationResult.hallucinatedSentences,
      },
      explainability: {
        sources: explainableResult.sources,
        overallConfidence: explainableResult.overallConfidence,
        retrievalMethod: explainableResult.retrievalMethod,
        explanationSummary: explainableResult.explanationSummary,
      },
    };

    res.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
  } catch (error: any) {
    console.error('Error during streaming chat query:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

export const getChatHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.query;
  const filter: any = { user: req.user?._id };
  if (courseId) filter.course = courseId;

  const chats = await Chat.find(filter)
    .populate('course', 'title code')
    .sort({ updatedAt: -1 })
    .select('title course totalMessages updatedAt createdAt');

  res.json({ success: true, count: chats.length, chats });
});

export const getChatById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const chat = await Chat.findOne({ _id: req.params.id, user: req.user?._id }).populate('course', 'title code');
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  res.json({ success: true, chat });
});

export const deleteChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Chat.findOneAndDelete({ _id: req.params.id, user: req.user?._id });
  res.json({ success: true, message: 'Chat deleted' });
});

export const renameChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const chat = await Chat.findOneAndUpdate(
    { _id: req.params.id, user: req.user?._id },
    { title },
    { new: true }
  );

  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }

  res.json({ success: true, chat });
});

async function updateDailyAnalytics(trustScore: number, responseTime: number, courseId: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Analytics.findOneAndUpdate(
      { date: today },
      [
        {
          $set: {
            totalQueries: { $add: [ { $ifNull: [ "$totalQueries", 0 ] }, 1 ] },
            hallucinationCount: {
              $add: [
                { $ifNull: [ "$hallucinationCount", 0 ] },
                trustScore < 45 ? 1 : 0
              ]
            },
            avgTrustScore: {
              $divide: [
                {
                  $add: [
                    { $multiply: [ { $ifNull: [ "$avgTrustScore", 0 ] }, { $ifNull: [ "$totalQueries", 0 ] } ] },
                    trustScore
                  ]
                },
                { $add: [ { $ifNull: [ "$totalQueries", 0 ] }, 1 ] }
              ]
            },
            avgResponseTime: {
              $divide: [
                {
                  $add: [
                    { $multiply: [ { $ifNull: [ "$avgResponseTime", 0 ] }, { $ifNull: [ "$totalQueries", 0 ] } ] },
                    responseTime
                  ]
                },
                { $add: [ { $ifNull: [ "$totalQueries", 0 ] }, 1 ] }
              ]
            }
          }
        },
        {
          $set: {
            hallucinationRate: {
              $multiply: [
                { $divide: [ "$hallucinationCount", "$totalQueries" ] },
                100
              ]
            }
          }
        }
      ] as any,
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('Failed to update analytics:', err);
  }
}
