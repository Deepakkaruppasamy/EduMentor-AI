import { Response, NextFunction } from 'express';
import Chat from '../models/Chat';
import { translateText } from '../services/ai/translation.service';
import { queryChat, queryChatStream } from './chat.controller';

export const queryChatMultilingual = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { question, language } = req.body;
    const userLang = language || req.user?.preferredLanguage || 'English';

    if (userLang.toLowerCase() === 'english') {
      return queryChat(req, res, next);
    }

    // 1. Translate question to English
    const englishQuestion = await translateText(question, userLang, 'English');
    
    // 2. Temporarily replace req.body.question with the English version
    req.body.question = englishQuestion;

    // 3. Intercept res.json to translate response back to the preferred language
    const originalJson = res.json;
    res.json = (async function (body: any) {
      // Restore original json function
      res.json = originalJson;

      if (body && body.success && body.answer) {
        try {
          const translatedAnswer = await translateText(body.answer, 'English', userLang);
          body.answer = translatedAnswer;

          if (body.chatId) {
            // Update MongoDB chat records to store user's selected language
            const chat = await Chat.findById(body.chatId);
            if (chat && chat.messages.length >= 2) {
              chat.messages[chat.messages.length - 2].content = question; // non-English input
              chat.messages[chat.messages.length - 1].content = translatedAnswer; // non-English output
              await chat.save();
            }
          }
        } catch (err) {
          console.error('Failed to translate json response back:', err);
        }
      }
      return originalJson.call(res, body);
    }) as any;

    // 4. Call standard controller
    return queryChat(req, res, next);
  } catch (err) {
    next(err);
  }
};

export const queryChatStreamMultilingual = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { question, language } = req.body;
    const userLang = language || req.user?.preferredLanguage || 'English';

    if (userLang.toLowerCase() === 'english') {
      return queryChatStream(req, res, next);
    }

    // 1. Translate question to English
    const englishQuestion = await translateText(question, userLang, 'English');
    req.body.question = englishQuestion;

    // 2. Mock res object to capture and translate streaming tokens in the background
    let accumulatedText = '';
    let donePayload: any = null;

    const mockRes: any = {
      headersSent: false,
      setHeader: () => {},
      flushHeaders: () => {},
      write: (data: string) => {
        const cleanLine = data.trim();
        if (cleanLine.startsWith('data: ')) {
          const dataStr = cleanLine.substring(6);
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'token') {
              accumulatedText += parsed.text;
            } else if (parsed.type === 'done') {
              donePayload = parsed;
            }
          } catch (e) {}
        }
      },
      end: async () => {
        try {
          if (!accumulatedText) {
            throw new Error('No streaming content accumulated from LLM.');
          }

          // Translate complete generated text to the preferred language
          const translatedAnswer = await translateText(accumulatedText, 'English', userLang);

          // Update MongoDB chat records to save conversation in selected language
          if (donePayload && donePayload.chatId) {
            const chat = await Chat.findById(donePayload.chatId);
            if (chat && chat.messages.length >= 2) {
              chat.messages[chat.messages.length - 2].content = question;
              chat.messages[chat.messages.length - 1].content = translatedAnswer;
              await chat.save();
            }
          }

          // Send SSE headers on the actual response
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();

          // Stream the translated words to simulate typing flow
          const words = translatedAnswer.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
            res.write(`data: ${JSON.stringify({ type: 'token', text: chunk })}\n\n`);
            await new Promise(r => setTimeout(r, 35)); // dynamic pacing
          }

          // Send final completion metadata payload
          if (donePayload) {
            res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
          }
        } catch (err: any) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        } finally {
          res.end();
        }
      }
    };

    // 3. Call standard stream controller with the mock receiver
    return queryChatStream(req, mockRes, next);
  } catch (err) {
    next(err);
  }
};
