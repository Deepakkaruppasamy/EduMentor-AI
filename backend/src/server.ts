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
import adminRoutes from './routes/admin.routes';
import facultyRoutes from './routes/faculty.routes';
import reportRoutes from './routes/report.routes';
import courseRoutes from './routes/course.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import quizRoutes from './routes/quiz.routes';
import recommendationRoutes from './routes/recommendation.routes';
import analyticsRoutes from './routes/analytics.routes';
import flashcardRoutes from './routes/flashcard.routes';
import assignmentEvaluationRoutes from './routes/assignment-evaluation.routes';
import messagingRoutes from './routes/messaging.routes';
import supportRoutes from './routes/support.routes';
import appointmentRoutes from './routes/appointment.routes';
import officeHoursRoutes from './routes/office-hours.routes';
import studyPlannerRoutes from './routes/study-planner.routes';
import calendarRoutes from './routes/calendar.routes';
import notesRoutes from './routes/notes.routes';
import researchRoutes from './routes/research.routes';
import searchRoutes from './routes/search.routes';
import announcementRoutes from './routes/announcement.routes';
import feedbackRoutes from './routes/feedback.routes';
import aiEvaluationRoutes from './routes/ai-evaluation.routes';
import { initMessagingSocketServer } from './services/messaging-socket.service';
import { initSupportSocketServer } from './services/support-socket.service';
import { errorHandler } from './middleware/errorHandler';
import { createServer } from 'http';
import { initSocketServer } from './services/socket.service';
import { initializeIndices } from './services/rag/index-sync.service';
import User from './models/User';

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
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/assignment-evaluations', assignmentEvaluationRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/office-hours', officeHoursRoutes);
app.use('/api/study-planner', studyPlannerRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai-evaluation', aiEvaluationRoutes);

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
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    // Prevent index.html serving for missing static assets
    if (path.extname(req.path)) {
      return res.status(404).send('Asset not found');
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

const PORT = config.PORT || 5000;

const start = async () => {
  try {
    await connectDatabase();

    // Seed default Super Admin if email doesn't exist
    const adminExists = await User.findOne({ email: 'admin@university.edu' });
    if (!adminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@university.edu',
        password: 'AdminPassword123!',
        role: 'admin',
        isFirstLogin: true,
        isActive: true,
        department: 'Administration',
      });
      console.log('✅ Seeded default Super Admin user: admin@university.edu / AdminPassword123!');
    }
    
    // Re-index completed documents on startup
    initializeIndices();

    const server = createServer(app);
    const io = initSocketServer(server);
    initMessagingSocketServer(io);
    initSupportSocketServer(io);
    server.listen(PORT, () => {
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
