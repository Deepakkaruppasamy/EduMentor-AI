import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/edumentor',
  JWT_SECRET: process.env.JWT_SECRET || 'edumentor-super-secret-jwt-key-2024',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  CHROMA_URL: process.env.CHROMA_URL || 'http://127.0.0.1:8000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  HF_API_KEY: process.env.HF_API_KEY || '',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  CHUNK_SIZE: 512,
  CHUNK_OVERLAP: 50,
  TOP_K_RESULTS: 5,
  HALLUCINATION_THRESHOLD: 0.4,
};
