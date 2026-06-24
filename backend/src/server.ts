import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import quizRoutes from './routes/quiz.routes';
import recommendationRoutes from './routes/recommendation.routes';
import analyticsRoutes from './routes/analytics.routes';
import flashcardRoutes from './routes/flashcard.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust proxy for rate limiting behind reverse proxies (e.g. Render)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NODE_ENV === 'development' ? 100000 : 5000,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

// Static uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/flashcards', flashcardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'EduMentor AI API' });
});

// Serve frontend in production
if (config.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  console.log(`[Frontend Serve] Target directory path: ${distPath}`);
  try {
    const exists = fs.existsSync(distPath);
    console.log(`[Frontend Serve] Directory exists: ${exists}`);
    if (exists) {
      console.log(`[Frontend Serve] Files inside:`, fs.readdirSync(distPath));
    }
  } catch (err: any) {
    console.error(`[Frontend Serve] Error checking directory:`, err.message);
  }

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ message: 'API route not found' });
    }
  });
}

// Error handler
app.use(errorHandler);

const PORT = config.PORT || 5000;

const start = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 EduMentor AI Server running on port ${PORT}`);
      console.log(`📚 Environment: ${config.NODE_ENV}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

export default app;
