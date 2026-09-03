# Formal Methodology Chapter: Hybrid Retrieval-Augmented Generation & Explainable Evidence Grounding in Higher Education AI Tutors

**Author / Project:** EduMentor AI  
**Focus Area:** Parallel Hybrid RAG, Reciprocal Rank Fusion, Vector Embedding Similarity, and Evidence Grounding Trust Evaluation.

---

## Abstract

This chapter details the mathematical, algorithmic, and software architectural design of the **EduMentor AI** Retrieval-Augmented Generation (RAG) framework. Modern Large Language Models (LLMs) used in pedagogical environments face challenges regarding subject hallucination, outdated parametric memory, and lack of empirical source verification. EduMentor AI addresses these challenges through a parallel hybrid retrieval strategy combining dense vector embeddings ($\text{MiniLM-L6-v2}$) and sparse keyword indexing ($\text{Okapi BM25}$), unified via Reciprocal Rank Fusion ($\text{RRF}$). Furthermore, an automated evidence grounding guardrail ($\text{TrustScore}$) calculates sentence-level n-gram overlap and cosine embedding similarity to enforce strict evidence verification.

---

## 1. Formal Problem Definition

Let $\mathcal{C}$ represent a university course corpus comprising $M$ academic documents $\mathcal{D} = \{d_1, d_2, \dots, d_M\}$. Each document $d_i$ is segmented into $N_i$ overlapping text chunks:

$$\mathcal{X} = \{x_{i,j} \mid 1 \le i \le M, 1 \le j \le N_i\}$$

Where each chunk $x_{i,j}$ contains text payload $T(x_{i,j})$, document identifier $\text{DocID}(x_{i,j})$, document title $\text{DocName}(x_{i,j})$, and page reference $P(x_{i,j})$.

When a student submits a natural language query $q$, the system must retrieve a subset $\mathcal{X}^K \subset \mathcal{X}$ of $K$ chunks ($K \ll |\mathcal{X}|$) that maximizes pedagogical relevance and semantic grounding for response generation.

---

## 2. Hybrid Retrieval Architecture

### 2.1. Dense Vector Similarity Search
Query $q$ and text chunks $x \in \mathcal{X}$ are embedded into a $D$-dimensional continuous vector space ($D=384$) using the HuggingFace `sentence-transformers/all-MiniLM-L6-v2` encoder $\mathbf{E}: \mathcal{T} \to \mathbb{R}^D$:

$$\mathbf{v}_q = \mathbf{E}(q), \quad \mathbf{v}_x = \mathbf{E}(T(x))$$

The dense vector relevance score $S_{\text{vector}}(q, x)$ is computed as the Cosine Similarity:

$$S_{\text{vector}}(q, x) = \cos(\mathbf{v}_q, \mathbf{v}_x) = \frac{\mathbf{v}_q \cdot \mathbf{v}_x}{\|\mathbf{v}_q\|_2 \|\mathbf{v}_x\|_2}$$

ChromaDB indexes these dense vectors using Hierarchical Navigable Small World (HNSW) graphs.

### 2.2. Sparse Keyword Retrieval (Okapi BM25)
To ensure precise matching for specialized academic terminology, codes, and acronyms, an inverted BM25 index scores chunk relevance:

$$S_{\text{BM25}}(q, x) = \sum_{t \in q} \text{IDF}(t) \cdot \frac{f(t, x) \cdot (k_1 + 1)}{f(t, x) + k_1 \cdot \left(1 - b + b \cdot \frac{|x|}{\text{avgdl}}\right)}$$

Where:
- $f(t, x)$ is the term frequency of term $t$ in chunk $x$.
- $|x|$ and $\text{avgdl}$ are chunk length and average chunk length across $\mathcal{X}$.
- $k_1 = 1.5$ and $b = 0.75$ are standard BM25 hyper-parameters.
- $\text{IDF}(t) = \ln \left( \frac{|\mathcal{X}| - n(t) + 0.5}{n(t) + 0.5} + 1 \right)$, with $n(t)$ being the number of chunks containing term $t$.

---

## 3. Reciprocal Rank Fusion (RRF)

Dense vector search and sparse BM25 search produce separate ranked lists $\mathcal{R}_{\text{vector}}$ and $\mathcal{R}_{\text{BM25}}$. To combine these disparate scoring distributions without arbitrary weight tuning, EduMentor AI employs Reciprocal Rank Fusion ($\text{RRF}$):

$$S_{\text{RRF}}(x) = \sum_{m \in \{\text{vector}, \text{BM25}\}} \frac{1}{k + r_m(x)}$$

Where:
- $r_m(x)$ is the 1-based rank index of chunk $x$ in search model $m$.
- $k = 60$ is a smoothing constant preventing high-rank dominance.

The Top-$K$ chunks with the highest $S_{\text{RRF}}(x)$ are selected for LLM context injection.

---

## 4. Evidence Grounding & Hallucination Guardrail

To prevent ungrounded LLM hallucinations, the generated assistant response $A$ is parsed into individual sentences $A = \{s_1, s_2, \dots, s_L\}$. Each sentence $s_l$ is evaluated against retrieved ground-truth context chunks $\mathcal{X}^K$:

$$g(s_l, \mathcal{X}^K) = \max_{x \in \mathcal{X}^K} \left( \alpha \cdot \text{nGramOverlap}(s_l, T(x)) + (1-\alpha) \cdot \cos(\mathbf{E}(s_l), \mathbf{E}(T(x))) \right)$$

Where $\alpha = 0.4$. The overall **Evidence Grounding Trust Score** is defined as:

$$\text{TrustScore}(A) = \left( \frac{1}{L} \sum_{l=1}^L g(s_l, \mathcal{X}^K) \right) \times 100$$

### Classification Thresholds:
- $\text{TrustScore} \ge 75\%$: **Verified Grounded** (Green Status)
- $45\% \le \text{TrustScore} < 75\%$: **Partially Verified** (Amber Status)
- $\text{TrustScore} < 45\%$: **Unverified / Flagged** (Red Status)

---

## 5. Software Architecture & File Traceability

| Theoretical Component | Implementation Service | Source File Link |
| :--- | :--- | :--- |
| Course Scope Classifier | `isQuestionRelevantToCourse` | [`groq.service.ts`](file:///c:/Chatbot/backend/src/services/ai/groq.service.ts#L283) |
| Dense Vector Search | `vectorSearch` | [`chroma.ts`](file:///c:/Chatbot/backend/src/utils/chroma.ts) |
| Sparse BM25 Search | `getBM25Index` | [`bm25-search.service.ts`](file:///c:/Chatbot/backend/src/services/rag/bm25-search.service.ts) |
| Reciprocal Rank Fusion | `reciprocalRankFusion` | [`rrf.service.ts`](file:///c:/Chatbot/backend/src/services/rag/rrf.service.ts#L1) |
| Hybrid RAG Controller | `hybridRetrieve` | [`hybrid-rag.service.ts`](file:///c:/Chatbot/backend/src/services/rag/hybrid-rag.service.ts#L37) |
| Citation Extraction | `buildExplainableResult` | [`explainability.service.ts`](file:///c:/Chatbot/backend/src/services/explainability/explainability.service.ts#L31) |
| Grounding Guardrail | `detectHallucination` | [`hallucination.service.ts`](file:///c:/Chatbot/backend/src/services/ai/hallucination.service.ts#L1) |
| UI Source Panel | `SourcePanel` | [`SourcePanel.tsx`](file:///c:/Chatbot/frontend/src/components/chat/SourcePanel.tsx) |
| UI Citation Drawer | `CitationViewer` | [`CitationViewer.tsx`](file:///c:/Chatbot/frontend/src/components/chat/CitationViewer.tsx) |
