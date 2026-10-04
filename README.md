# EduMentor AI 🎓

> **Explainable Multi-Course Educational Chatbot Using Llama 3, Hybrid RAG, and Hallucination Detection**

A production-ready, AI-powered virtual tutor for higher education. Built with React, Node.js, MongoDB, ChromaDB, and Llama 3 via Groq API.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://typescriptlang.org)
[![Llama 3](https://img.shields.io/badge/Llama%203-70B-purple.svg)](https://groq.com)

---

## ✨ Features

### 🎓 Student Features
- **AI Chat Tutor** — ChatGPT-style interface with course-specific RAG
- **Hybrid RAG** — Vector similarity + BM25 keyword search with Reciprocal Rank Fusion
- **Hallucination Detection** — Trust score per response (0-100%)
- **Explainable AI** — Source documents, page numbers, confidence scores
- **Quiz Generator** — MCQ, Short Answer, Long Answer with difficulty levels
- **Progress Tracking** — Learning analytics dashboard
- **Personalized Recommendations** — AI-generated revision plans
- **Chat History** — Persistent conversation history

### 👨‍🏫 Faculty Features
- **Course Management** — Create and manage courses
- **Document Upload** — Drag-and-drop PDF/DOCX/PPTX/TXT
- **Auto-Processing** — Extract → Chunk → Embed → Store in ChromaDB
- **Analytics Dashboard** — System-wide metrics and usage stats

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, MUI, Framer Motion |
| **Backend** | Node.js, Express, TypeScript |
| **AI/LLM** | Llama 3 70B via Groq API |
| **Vector DB** | ChromaDB |
| **Main DB** | MongoDB Atlas |
| **Embeddings** | HuggingFace Inference API (all-MiniLM-L6-v2) |
| **RAG** | Hybrid: Vector + BM25 + Reciprocal Rank Fusion |
| **Auth** | JWT + bcrypt |

---

## 📁 Project Structure

```
c:\Chatbot\
├── frontend/          # React + Vite + TypeScript frontend
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Route-level pages
│       ├── services/      # Axios API services
│       ├── store/         # Zustand state management
│       └── types/         # TypeScript types
│
├── backend/           # Node.js + Express + TypeScript backend
│   └── src/
│       ├── models/        # MongoDB Mongoose schemas
│       ├── controllers/   # Route handlers
│       ├── routes/        # Express routers
│       ├── services/
│       │   ├── ai/        # Groq LLM integration
│       │   ├── rag/       # Hybrid RAG (Vector + BM25 + RRF)
│       │   ├── hallucination/  # Trust score computation
│       │   ├── explainability/ # Source citation builder
│       │   ├── quiz/      # Quiz generation
│       │   └── recommendations/ # Personalized learning
│       ├── middleware/    # Auth, upload, error handling
│       └── utils/         # Document processor, chunker, embeddings
│
├── docker-compose.yml # ChromaDB + MongoDB local setup
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker (for ChromaDB)
- MongoDB Atlas account (or local Docker MongoDB)
- Groq API key ([Get free at groq.com](https://console.groq.com))
- HuggingFace API key ([Get free at huggingface.co](https://huggingface.co/settings/tokens))

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts ChromaDB on port `8000` and optional local MongoDB on port `27017`.

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your GROQ_API_KEY, MONGODB_URI, HF_API_KEY
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### 4. Seed Courses

1. Register as **Faculty**
2. Go to **Courses** → Click **Seed Defaults** to create 5 predefined courses:
   - Database Management Systems
   - Operating Systems
   - Computer Networks
   - Data Structures
   - Machine Learning

### 5. Upload Course Materials

1. Go to **Upload Documents**
2. Select a course
3. Drag-and-drop your PDFs/DOCX files
4. Wait for processing (chunks → embeddings → ChromaDB)

### 6. Chat with the AI Tutor!

1. Register as **Student** → Select a course → Ask questions

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq API key for Llama 3 | ✅ Yes |
| `MONGODB_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | JWT signing secret | ✅ Yes |
| `HF_API_KEY` | HuggingFace API for embeddings | Recommended |
| `CHROMA_URL` | ChromaDB server URL | Default: `http://localhost:8000` |

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Get current user |

### Courses
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/course/create` | Create course (faculty) |
| GET | `/api/course/all` | List all courses |
| POST | `/api/course/enroll` | Enroll student |
| POST | `/api/course/seed` | Seed predefined courses |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/document/upload` | Upload PDF/DOCX/PPTX |
| GET | `/api/document/all` | List documents |

### Chat (RAG Pipeline)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/query` | Ask question → get answer + sources + trust score |
| GET | `/api/chat/history` | Chat history |

### Quiz
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/quiz/generate` | Generate MCQ/Short/Long questions |
| POST | `/api/quiz/evaluate` | Submit answers |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Admin stats |
| GET | `/api/analytics/progress` | Student progress |

---

## 🏛️ System Architecture & Methodology (IEEE Paper)

> **"LLM-Driven Intelligent Educational Platform Using Hybrid RAG for Personalized Learning and Academic Support"**  
> *Authors: Vanitha P, Deepak K, Deva C (Dept. of Information Technology, Kongu Engineering College)*

### Fig. 1. Overall System Architecture of the Proposed Educational Platform

```mermaid
flowchart TD
    Users["STUDENTS / FACULTY / ADMIN"]
    
    subgraph PresentationLayer ["PRESENTATION LAYER"]
        WebUI["Web Application UI (React + Vite)"]
    end
    
    subgraph ApplicationLayer ["APPLICATION LAYER (Express.js Backend)"]
        direction LR
        UserMgmt["User / Session\nManagement"]
        AcademicSupport["Academic Support\nModules"]
        AdminDashboard["Admin & Evaluation\nDashboard"]
    end
    
    subgraph KnowledgeLayer ["KNOWLEDGE & GENERATION LAYER"]
        direction TB
        subgraph DataSources ["Databases & Indices"]
            MongoStore[("Data Store\n(MongoDB)")]
            ChromaStore[("Vector Search\n(ChromaDB)")]
            BM25Store[("Lexical Search\n(BM25)")]
        end
        
        HybridRAGEngine["Hybrid RAG Engine\n(Reciprocal Rank Fusion + Context Construction)"]
        GenEngine["Generation Engine\n(openai/gpt-oss-120b via Groq / Llama 3)"]
        
        ChromaStore --> HybridRAGEngine
        BM25Store --> HybridRAGEngine
        HybridRAGEngine --> GenEngine
    end
    
    Users <--> WebUI
    WebUI <--> ApplicationLayer
    ApplicationLayer <--> KnowledgeLayer
```

---

### Fig. 2. Knowledge Acquisition and Document Processing Pipeline

```mermaid
flowchart LR
    subgraph OfflinePipeline ["OFFLINE INGESTION PIPELINE"]
        direction TB
        Sources["COURSE SOURCES\n(PDF, PPT, DOCX)"] --> DocParsing["Document Parsing"]
        DocParsing --> TextExtract["Text Extraction"]
        TextExtract --> Preprocess["Preprocessing"]
        Preprocess --> RecChunk["Recursive Chunking"]
        
        RecChunk --> DenseEmb["Dense Embedding\n(all-MiniLM-L6-v2)"]
        RecChunk --> SparseIdx["Sparse Indexing\n(TF-IDF / Tokenization)"]
        RecChunk --> ChunkObj["Chunk Object\n(Content + Doc ID + Page Number)"]
    end
    
    subgraph KnowledgeStores ["KNOWLEDGE STORES"]
        direction TB
        VectorDB[("Vector Store\n(ChromaDB)")]
        KeywordIdx[("Keyword Index\n(BM25)")]
        MetaDB[("Metadata\n(MongoDB)")]
    end
    
    DenseEmb --> VectorDB
    SparseIdx --> KeywordIdx
    ChunkObj --> MetaDB
```

---

### Fig. 3. Hybrid Retrieval-Augmented Generation Architecture

```mermaid
flowchart TD
    UserQuery["USER QUERY"] --> Gatekeeper["Query Processing & Gatekeeper\n(qwen3.6-27b relevance check)"]
    
    subgraph SemanticBranch ["SEMANTIC RETRIEVAL BRANCH"]
        QueryEmb["Query Embedding\n(all-MiniLM-L6-v2)"] --> DenseSearch["Dense Vector Search"] --> ChromaDB[("ChromaDB Vector Store")]
    end
    
    subgraph LexicalBranch ["LEXICAL RETRIEVAL BRANCH"]
        QueryTok["Query Tokenization"] --> KeywordMatch["Exact Keyword Matching"] --> BM25Index[("Okapi BM25 Index")]
    end
    
    Gatekeeper --> QueryEmb
    Gatekeeper --> QueryTok
    
    ChromaDB --> RRF["RECIPROCAL RANK FUSION (RRF)\nRRF(d) = Σ 1 / (k + rank(d)), k=60"]
    BM25Index --> RRF
    
    RRF --> ContextConst["Context Construction\n(Top-K Chunks + Source/Page Metadata)"]
    ContextConst --> LLMGen["LLM Generation Engine\n(openai/gpt-oss-120b / llama-3.3-70b-versatile via Groq)"]
```

---

### Fig. 4. Query Processing and Response Generation Workflow

```mermaid
flowchart TD
    UserQ["USER QUERY"] --> GatekeeperCheck{"Gatekeeper\nRelevance Check"}
    
    GatekeeperCheck -- "Off-Topic / Decline" --> RejectClarify["Reject / Clarify Request"]
    RejectClarify --> WebUI["WEB APPLICATION UI"]
    
    GatekeeperCheck -- "Course-Relevant" --> HybridRAG["Hybrid RAG Pipeline"]
    
    subgraph RuntimeGen ["RUNTIME GENERATION AND VALIDATION"]
        HybridRAG --> ContextConst["Context Construction"]
        ContextConst --> LLM["LLM (Llama 3 / gpt-oss-120b)"]
        LLM --> TrustScore{"TrustScore Guardrail\n(n-gram overlap + Cosine Grounding)"}
        TrustScore -- "Fail (< Threshold)\nRegenerate" --> LLM
    end
    
    TrustScore -- "Pass (Valid)\nTrustScore >= 70%" --> WebUI
```

---

### Fig. 5. Personalized Learning Architecture

```mermaid
flowchart LR
    subgraph Inputs ["STUDENT SIGNALS"]
        direction TB
        UserProfile["User Profile"]
        InteractionLogs["Interaction Logs"]
        QuizPerf["Quiz Performance"]
        ExamDates["Exam Dates"]
    end
    
    subgraph PersonalizationLogic ["PERSONALIZATION LOGIC MODULE"]
        direction TB
        StudyPlanner["Study Planner"] --> StudySchedule["Study Schedule"]
        TopicAnalysis["Topic Analysis\n(Weak Area Detection)"] --> TargetedTopics["Targeted Topics"]
    end
    
    UserProfile --> StudyPlanner
    InteractionLogs --> StudyPlanner
    QuizPerf --> TopicAnalysis
    ExamDates --> StudyPlanner
    
    StudySchedule --> PromptInject["LLM Prompt Injection\n(Personalized Context Window)"]
    TargetedTopics --> PromptInject
    
    PromptInject --> TailoredResp["Tailored Responses &\nStudent UI"]
```

---

### Fig. 6. Academic Support Workflow

```mermaid
flowchart TD
    UserQuery["USER ACADEMIC QUERY"] --> IntentRouter["Intent Routing Module"]
    
    subgraph SupportModes ["ACADEMIC SUPPORT MODES"]
        ExplainMode["Q&A / Explain Mode\n- Concept Simplification\n- Real-World Examples"]
        StudyHelp["Study Help\n- Concept Graphs\n- Exam Summaries"]
        AssignEval["Assignment Evaluator\n- Rubric Grading\n- Constructive Feedback"]
    end
    
    IntentRouter --> ExplainMode
    IntentRouter --> StudyHelp
    IntentRouter --> AssignEval
    
    ExplainMode --> RAGLayer["Hybrid RAG + LLM Layer"]
    StudyHelp --> RAGLayer
    AssignEval --> RAGLayer
    
    RAGLayer --> EvidenceResponse["Evidence-Backed Response\n(Verified Citations + Page Numbers)"]
```

---

### Fig. 7. Administrative and Evaluation Architecture

```mermaid
flowchart LR
    subgraph SystemData ["SYSTEM DATA"]
        direction TB
        UserInteractions["User Interactions"]
        APILatency["API Latency"]
        AIOutputs["AI Outputs"]
    end
    
    subgraph EvalLayer ["EVALUATION LAYER"]
        direction TB
        RetAccuracy["Retrieval Accuracy (P@5)"]
        HallucinationScore["Hallucination TrustScore"]
        PerfMetrics["Performance Metrics"]
    end
    
    subgraph AdminDashboard ["ADMIN DASHBOARD"]
        direction TB
        RealtimeMon["Real-Time Monitoring"]
        AutoReports["Automated Reports"]
    end
    
    SystemData --> EvalLayer
    RetAccuracy --> AdminDashboard
    HallucinationScore --> AdminDashboard
    PerfMetrics --> AdminDashboard
```

---

### Fig. 8. End-to-End Methodology of the Proposed Platform

```mermaid
flowchart TD
    subgraph Phase1 ["PHASE 1: OFFLINE KNOWLEDGE PREPARATION"]
        CourseDocs["Course Documents"] --> Parsing["Ingestion & Parsing"]
        Parsing --> Chunking["Recursive Chunking"]
        Chunking --> DualEmbedding["Vector + BM25 Embedding"]
        DualEmbedding --> KnowledgeStores[("Knowledge Stores\n(ChromaDB + BM25 + MongoDB)")]
    end
    
    subgraph Phase2 ["PHASE 2: ONLINE QUERY EXECUTION"]
        UserQuery["User Query"] --> RelGate["Relevance Gate (Gatekeeper)"]
        RelGate --> HybridRet["Hybrid Retrieval\n(Vector + BM25 via RRF)"]
        HybridRet --> ContextAssembly["Context Assembly\n(Top-K + Citations)"]
        ContextAssembly --> LLMGen["LLM Generation\n(openai/gpt-oss-120b)"]
        LLMGen --> TrustScoreGuard["TrustScore Guardrail\n(Verification Check)"]
        TrustScoreGuard --> FinalUI["Final Response UI\n(Student Interface)"]
    end
    
    KnowledgeStores -.-> HybridRet
```

---

## 🎨 UI Highlights

- **Dark glassmorphism** design with backdrop blur
- **Apple-inspired** typography (Inter font)
- **ChatGPT-style** chat interface
- **Framer Motion** animations
- **Responsive** mobile-first layout
- **Real-time** trust score badges
- **Collapsible** source citation panels

---

## 🚀 Deployment Guide

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

Set env: `VITE_API_URL=https://your-backend.onrender.com/api`

### Backend → Render

1. Create a new Web Service on Render
2. Set root directory to `backend`
3. Build command: `npm install && npm run build`
4. Start command: `node dist/server.js`
5. Add environment variables from `.env.example`

### ChromaDB → Render

1. Create a new Web Service with Docker
2. Use image: `ghcr.io/chroma-core/chroma:latest`
3. Port: `8000`
4. Set `CHROMA_URL` in your backend env to this service URL

### MongoDB → MongoDB Atlas

1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Add IP whitelist (0.0.0.0/0 for Render)
3. Create database user
4. Copy connection string to `MONGODB_URI`

---

## 📄 License

MIT License — Built for educational purposes.

---

*Built with ❤️ using Llama 3, Hybrid RAG, and modern web technologies*
