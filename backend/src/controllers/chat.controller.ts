import { Response } from 'express';
import Chat from '../models/Chat';
import Course from '../models/Course';
import Analytics from '../models/Analytics';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';
import { generateResponse, generateResponseStream, extractConceptGraph, generateWithoutContext } from '../services/ai/groq.service';
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

  const preferredLanguage = req.user?.preferredLanguage || 'English';

  // 3. Generate LLM response
  const llmResponse = await generateResponse(recentHistory, ragResult.context, 0.3, preferredLanguage);

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

  const preferredLanguage = req.user?.preferredLanguage || 'English';

  try {
    await generateResponseStream(recentHistory, ragResult.context, onToken, 0.3, preferredLanguage);

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

export const explainMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id: chatId, messageIndex } = req.params;
  const { explanationType } = req.body;

  if (!chatId || messageIndex === undefined || !explanationType) {
    return res.status(400).json({ success: false, message: 'chatId, messageIndex, and explanationType are required.' });
  }

  const index = parseInt(messageIndex, 10);
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat session not found.' });
  }

  if (index < 0 || index >= chat.messages.length) {
    return res.status(400).json({ success: false, message: 'Invalid message index.' });
  }

  const message = chat.messages[index];
  if (message.role !== 'assistant') {
    return res.status(400).json({ success: false, message: 'Explanations can only be generated for assistant responses.' });
  }

  if (!message.explanations) {
    message.explanations = {};
  }

  // Check if explanation already exists (cached)
  const existing = (message.explanations as any)[explanationType];
  if (existing) {
    return res.json({ success: true, explanation: existing });
  }

  let systemPrompt = 'You are an AI teaching assistant. Always respond in formatted Markdown.';
  let prompt = '';

  const originalContent = message.content;
  const contextText = message.sources?.map(s => s.chunkText).join('\n') || '';

  switch (explanationType) {
    case 'simply':
      systemPrompt = 'You are an educational assistant. Your goal is to explain complex concepts in simple, easy-to-understand terms for beginners. Avoid advanced jargon.';
      prompt = `Rewrite and explain this explanation simply for a absolute beginner:\n\nOriginal Answer: "${originalContent}"`;
      break;
    case 'detail':
      systemPrompt = 'You are an academic university professor. Provide rich detail, advanced terminology, and comprehensive depth.';
      prompt = `Provide a comprehensive, detailed academic explanation of this topic. Expand on key terms and cover technical details. Use this retrieved context to assist you if relevant:\n"${contextText}"\n\nOriginal Concept Summary: "${originalContent}"`;
      break;
    case 'example':
      systemPrompt = 'You are an illustrative educator. You explain core ideas by constructing clear, descriptive examples.';
      prompt = `Create a simple, relatable example or scenario that demonstrates the concepts in this text:\n\n"${originalContent}"`;
      break;
    case 'realWorld':
      systemPrompt = 'You are an industry expert. You explain how theoretical concepts are applied in production systems, software, or actual business hardware.';
      prompt = `Explain how the concepts in this text are applied in industry or real-world production settings. Give specific scenarios:\n\n"${originalContent}"`;
      break;
    case 'exam':
      systemPrompt = 'You are a university examiner. You structure answers to optimize for grading rubrics and exam scores.';
      prompt = `Structure the following concept explanation in a formal university exam format. Include:\n1. Precise Definition\n2. Key Points (bullet list)\n3. Main Advantages & Disadvantages\n4. Important Exam Notes.\n\nContent:\n"${originalContent}"`;
      break;
    default:
      return res.status(400).json({ success: false, message: 'Invalid explanationType. Allowed values: simply, detail, example, realWorld, exam.' });
  }

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      systemPrompt,
      0.4
    );

    // Save explanation
    (message.explanations as any)[explanationType] = response.content;
    chat.markModified('messages');
    await chat.save();

    res.json({
      success: true,
      explanation: response.content
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'AI explanation generation failed.' });
  }
});
