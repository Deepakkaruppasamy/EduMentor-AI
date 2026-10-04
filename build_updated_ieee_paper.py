import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.enum.section import WD_SECTION_START

def create_element(name):
    return OxmlElement(name)

def create_attribute(element, name, value):
    element.set(qn(name), value)

def set_number_of_columns(section, num_cols):
    sectPr = section._sectPr
    cols = sectPr.xpath('./w:cols')
    if not cols:
        cols = OxmlElement('w:cols')
        sectPr.append(cols)
    else:
        cols = cols[0]
    cols.set(qn('w:num'), str(num_cols))
    cols.set(qn('w:space'), '360') # 0.25 inch spacing

def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    if level == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text.upper())
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.bold = True
    elif level == 2:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.italic = True
    elif level == 3:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.italic = True

def add_paragraph(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

def add_author_cell(cell, name, dept, college, city, email):
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    
    run_name = p.add_run(f"{name}\n")
    run_name.font.name = 'Times New Roman'
    run_name.font.size = Pt(10.5)
    run_name.bold = True
    
    run_dept = p.add_run(f"{dept}\n{college}\n{city}\n")
    run_dept.font.name = 'Times New Roman'
    run_dept.font.size = Pt(9)
    run_dept.italic = True
    
    run_email = p.add_run(f"{email}")
    run_email.font.name = 'Times New Roman'
    run_email.font.size = Pt(9)
    run_email.font.underline = True
    run_email.font.color.rgb = RGBColor(0, 0, 255)

def format_table(table, headers, data):
    table.style = 'Table Grid'
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(8.5)
            r.font.bold = True
            
    for row_data in data:
        row_cells = table.add_row().cells
        for j, val in enumerate(row_data):
            row_cells[j].text = str(val)
            p = row_cells[j].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if j > 0 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(8)

def main():
    doc = Document()
    
    # -----------------------------
    # SECTION 1 (1-column layout for title and authors)
    # -----------------------------
    section1 = doc.sections[0]
    section1.top_margin = Inches(0.75)
    section1.bottom_margin = Inches(0.75)
    section1.left_margin = Inches(0.63)
    section1.right_margin = Inches(0.63)

    # Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(12)
    run = title.add_run("LLM-Driven Intelligent Educational Platform Using Hybrid RAG for Personalized Learning and Academic Support")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(21)
    run.bold = True

    # Authors Table (2 rows: row 1 has 3 authors, row 2 has 2 authors)
    table = doc.add_table(rows=2, cols=3)
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER
    table.autofit = True
    
    # Row 1 (3 Authors)
    add_author_cell(table.cell(0, 0), "Vanitha P", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "vanitha.it@kongu.edu")
    add_author_cell(table.cell(0, 1), "Nithya T", "Dept. Information Technology", "Velalar College of Engineering", "Erode, India", "tnithya27@gmail.com")
    add_author_cell(table.cell(0, 2), "Aarthi R", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "aarthi.it@kongu.edu")
    
    # Row 2 (2 Authors)
    add_author_cell(table.cell(1, 0), "Deepak K", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "deepakk.23it@kongu.edu")
    add_author_cell(table.cell(1, 1), "Deva C", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "devac.23it@kongu.edu")
    table.cell(1, 2).text = "" # blank cell for symmetry
    
    doc.add_paragraph() # Spacing before abstract
    
    # -----------------------------
    # SECTION 2 (2-column layout for the body)
    # -----------------------------
    new_section = doc.add_section(WD_SECTION_START.CONTINUOUS)
    set_number_of_columns(new_section, 2)
    new_section.top_margin = Inches(0.75)
    new_section.bottom_margin = Inches(0.75)
    new_section.left_margin = Inches(0.63)
    new_section.right_margin = Inches(0.63)

    # Abstract
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("Abstract— ")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(9)
    run.bold = True
    run.italic = True
    
    abs_text = (
        "Standard Large Language Model (LLM) deployments in higher education suffer from stochastic hallucination, "
        "parametric knowledge drift, and an acute vulnerability to out-of-curriculum dissemination. Conventional "
        "dense vector Retrieval-Augmented Generation (RAG) partially mitigates this by supplying external context, but fails "
        "in technical engineering domains due to its inability to resolve domain-specific acronyms, mathematical formulas, "
        "and condensed OCR strings. This paper presents EduMentor AI, an end-to-end intelligent educational architecture "
        "that resolves these fundamental limitations through three novel technical contributions: (1) a Query-Adaptive "
        "Hybrid RAG engine combining dense vector embeddings with Okapi BM25 sparse keyword indices unified via Weighted "
        "Reciprocal Rank Fusion (RRF); (2) a Multi-Signal Natural Language Inference (NLI) Atomic Claim Grounding Engine "
        "(TrustScore) that decomposes generated answers into propositional units and scores them via substring containment, "
        "character 4-grams, and semantic entailment, triggering closed-loop autonomous self-correction when support falls below "
        "threshold; and (3) a Cognitive-Adaptive Educational Scaffolding mechanism that classifies incoming student queries into "
        "Bloom's Revised Taxonomy cognitive levels to modulate between Socratic scaffolding and direct explanation, paired with "
        "an Ebbinghaus memory retention model. In empirical benchmarks across five system configurations and seven multi-dimensional "
        "evaluations (N = 34 participants), EduMentor AI achieves 95.8% Precision@5, 96.8% Recall@5, 0.965 MRR, and 98.0% manual correctness "
        "under blinded faculty evaluation. In automated hallucination detection, the platform achieves 97.9% accuracy and 98.6% specificity, "
        "massively surpassing the 8.0% specificity reported in recent literature. A paired pre/post-intervention experimental trial demonstrates "
        "a statistically significant learning gain of +37.8% (p < 0.001, Cohen's dz = 2.45, normalized gain g = 0.909) with a 115ms retrieval latency "
        "and an operational cost of $0.043 per 100 queries."
    )
    run_abs = p.add_run(abs_text)
    run_abs.font.name = 'Times New Roman'
    run_abs.font.size = Pt(9)
    run_abs.bold = True
    run_abs.italic = True

    # Keywords
    p_kw = doc.add_paragraph()
    p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw.paragraph_format.space_after = Pt(8)
    run_kw_label = p_kw.add_run("Keywords— ")
    run_kw_label.font.name = 'Times New Roman'
    run_kw_label.font.size = Pt(9)
    run_kw_label.bold = True
    run_kw_label.italic = True
    run_kw = p_kw.add_run("Large Language Models, Hybrid RAG, Okapi BM25, Reciprocal Rank Fusion, Multi-Signal NLI Grounding, TrustScore Guardrail, Bloom's Taxonomy, Educational AI.")
    run_kw.font.name = 'Times New Roman'
    run_kw.font.size = Pt(9)
    run_kw.bold = True
    run_kw.italic = True

    # I. INTRODUCTION
    add_heading(doc, "I. INTRODUCTION", 1)
    add_paragraph(doc, 
        "Large Language Models (LLMs) have catalyzed a major paradigm shift in computer-assisted learning, demonstrating human-like "
        "fluency, code synthesis, and multi-step conversational reasoning. In higher education, the prospect of deploying LLMs as "
        "round-the-clock virtual tutors promises to alleviate severe faculty-to-student bandwidth bottlenecks, facilitate individualized "
        "remediation, and democratize access to high-quality academic support. However, standard autoregressive LLMs remain fundamentally "
        "unconstrained probabilistic generators. When deployed without curriculum-grounded guardrails, they frequently hallucinate plausible "
        "yet factually flawed explanations, extrapolate beyond official course syllabi, and produce inaccurate derivations. In university "
        "engineering disciplines—where conceptual mastery depends on exact definitions, theorems, relational schemas, and formal algorithms—such "
        "inaccuracies directly impair student learning and violate institutional academic integrity standards."
    )

    add_heading(doc, "A. Motivation of This Work", 2)
    add_paragraph(doc, 
        "Modern university courses confront students with extensive, heterogeneous academic corpora: multi-hundred-page textbooks, "
        "condensed lecture slide decks, lab manuals, and supplementary research papers. Contemporary Learning Management Systems (LMS) "
        "such as Moodle, Canvas, and Blackboard operate purely as passive document repositories. When students encounter conceptual roadblocks "
        "during self-regulated study or late-night exam revision, passive LMS repositories offer no semantic synthesis or real-time guidance. "
        "Students expend substantial cognitive bandwidth manually searching through disjointed PDFs, while faculty are inundated with repetitive "
        "procedural inquiries. What higher education urgently requires is an active, curriculum-anchored intelligence layer capable of locating "
        "authoritative source evidence and synthesizing pedagogically scaffolded explanations with verifiable citations."
    )

    add_heading(doc, "B. Problem Statement & Research Challenges", 2)
    add_paragraph(doc, 
        "Retrieval-Augmented Generation (RAG) has emerged as the leading framework to anchor generative models in external knowledge. "
        "However, applying standard RAG to university academic corpora exposes three critical technical deficiencies:"
    )
    add_paragraph(doc, 
        "1) The Semantic-Lexical Retrieval Mismatch: Standard dense vector embeddings (e.g., Sentence-BERT, text-embedding-ada) excel at conceptual "
        "generalization but catastrophically fail on exact domain keywords, acronyms (e.g., '2PL', 'ACID', 'BCNF'), formal syntax, and condensed "
        "OCR text where spaces between words are missing. Conversely, sparse keyword algorithms (e.g., Okapi BM25) capture exact lexical matches "
        "but fail when student queries utilize conversational synonyms or paraphrasing."
    )
    add_paragraph(doc, 
        "2) The Hallucination Verification Deficit: Existing RAG platforms rely on heuristic string-matching or trust the LLM's self-reported "
        "confidence. In the recent benchmark study by Neumann et al. (IEEE Trans. on Education, 2025) on MoodleBot, the automated grounding checker "
        "achieved an accuracy of ~82% but suffered from an alarming 8.0% specificity rate—meaning 92% of hallucinated claims slipped through undetected."
    )
    add_paragraph(doc, 
        "3) The Pedagogical Absence: Conventional RAG bots operate as passive question-answering engines, treating high-order design inquiries and "
        "rote recall queries identically. They directly hand over finished assignment solutions rather than providing Socratic scaffolding, encouraging "
        "passive copying rather than active conceptual mastery."
    )

    add_heading(doc, "C. Research Objectives & Original Technical Contributions", 2)
    add_paragraph(doc, 
        "To decisively overcome these challenges, this paper presents EduMentor AI, an end-to-end intelligent educational platform. "
        "The primary technical and scientific contributions are:"
    )
    add_paragraph(doc, 
        "• Dual-Branch Hybrid RAG Pipeline: We formulate an optimized parallel retrieval architecture that executes dense MiniLM semantic similarity "
        "in parallel with Okapi BM25 sparse matching, dynamically unified via Weighted Reciprocal Rank Fusion (RRF) with cross-encoder re-ranking, "
        "achieving a sub-150ms retrieval latency (115ms) and a Precision@5 of 95.8%."
    )
    add_paragraph(doc, 
        "• Multi-Signal NLI Atomic Claim Grounding Engine (TrustScore): We formalize an automated evidence-grounding engine that decomposes generated "
        "responses into atomic propositional claims, scoring each claim through a joint multi-signal function combining character 4-gram overlap, "
        "subword/substring OCR containment, and natural language inference (NLI) entailment. It enforces a closed-loop self-correction cycle that rewrites "
        "ungrounded sentences before delivery to the student."
    )
    add_paragraph(doc, 
        "• Cognitive-Adaptive Scaffolding Architecture: We design an intent classifier mapped to Anderson & Krathwohl's Revised Bloom's Taxonomy that "
        "dynamically alters generation strategies between direct explanation, 3-stage Socratic hint scaffolding, and reflective inquiry, integrated with an "
        "Ebbinghaus spaced-repetition forgetting curve engine."
    )
    add_paragraph(doc, 
        "• Comprehensive 7-Study Empirical Validation: We present an exhaustive experimental evaluation across 5 system configurations, demonstrating 98.0% "
        "faculty-blinded correctness, 97.9% automated grounding accuracy with 98.6% specificity, and a statistically significant learning gain of +37.8% "
        "(p < 0.001, Cohen's dz = 2.45) in a paired student cohort (N = 34), systematically outperforming the IEEE 2025 MoodleBot baseline."
    )

    # II. RELATED WORK
    add_heading(doc, "II. RELATED WORK AND BACKGROUND", 1)
    add_heading(doc, "A. LLMs in Educational Chatbots", 2)
    add_paragraph(doc, 
        "Early conversational agents in education relied on rule-based finite-state automata or intent classification pipelines (e.g., Rasa, Dialogflow). "
        "While deterministic, these systems were notoriously brittle, requiring laborious manual intent authoring and failing on unscripted student inquiries. "
        "The introduction of Transformer-based models (Vaswani et al., 2017) and generative pretrained models (Brown et al., 2020) enabled fluid conversational "
        "interfaces. However, comprehensive reviews by Yan et al. (2024) and Dong et al. (2024) emphasize that pure parametric generation creates severe "
        "pedagogical risks due to hallucination, sycophancy, and lack of syllabus bounds."
    )

    add_heading(doc, "B. Retrieval-Augmented Generation & Fusion Techniques", 2)
    add_paragraph(doc, 
        "Lewis et al. (2020) established Retrieval-Augmented Generation (RAG) by conditioning autoregressive decoders on retrieved passages. Traditional "
        "implementations utilize bi-encoder dense embeddings (Reimers & Gurevych, 2019). While dense vectors effectively capture broad semantic similarity, "
        "Robertson & Zaragoza (2009) demonstrated that probabilistic term-matching algorithms (Okapi BM25) remain indispensable for exact symbol and entity "
        "retrieval. Cormack et al. (2009) introduced Reciprocal Rank Fusion (RRF) to merge heterogeneous rank lists without parameter tuning. While hybrid "
        "search has been explored in general web search, its formal integration with pedagogical cognitive scaffolding and claim-level NLI verification in "
        "higher education remains an open research frontier."
    )

    add_heading(doc, "C. Hallucination Detection & Evidence Grounding Guardrails", 2)
    add_paragraph(doc, 
        "Quantifying faithfulness in generated text has advanced from simple n-gram overlap (BLEU, ROUGE) to semantic similarity (BERTScore) and Natural "
        "Language Inference (NLI) entailment models. Min et al. (2023) proposed FActScore, demonstrating that evaluating atomic factual claims yields "
        "vastly superior diagnostic precision compared to document-level evaluation. In higher education, Neumann et al. (2025) deployed an LLM-driven "
        "chatbot for database courses (MoodleBot), utilizing vector search and an automated fact-checking prompt. However, MoodleBot's checker suffered "
        "from an alarming 8% specificity, falsely approving 92% of hallucinated statements. EduMentor AI directly addresses this gap through multi-signal "
        "propositional claim decomposition."
    )

    # III. PROPOSED SYSTEM
    add_heading(doc, "III. SYSTEM ARCHITECTURE & MATHEMATICAL FORMULATION", 1)
    add_heading(doc, "A. Overall Architectural Framework", 2)
    add_paragraph(doc, 
        "EduMentor AI is structured as a resilient, service-oriented educational platform comprising a responsive React client, an Express.js backend "
        "orchestration server, an asynchronous document processing and embedding pipeline, a dual ChromaDB + Okapi BM25 storage layer, and an LPU-accelerated "
        "inference engine powered by Groq (openai/gpt-oss-120b with automated fallback to llama-3.3-70b-versatile). The full system architecture coordinates "
        "secure role-based access for students, instructors, and administrators, maintaining comprehensive audit logs."
    )

    add_heading(doc, "B. Mathematical Formulation of the Hybrid RAG Engine", 2)
    add_paragraph(doc, 
        "Let D = {d_1, d_2, ..., d_N} denote the corpus of text chunks extracted from verified course documents, where each chunk d_j is annotated with "
        "document identifier doc_id and verified page number p_idx. Upon receiving an incoming student query q, the retrieval engine executes dual-channel "
        "retrieval concurrently:"
    )
    add_paragraph(doc, 
        "1) Dense Semantic Retrieval: Query q and chunks d_j are mapped into a 384-dimensional dense vector space using all-MiniLM-L6-v2. The dense semantic "
        "similarity score is defined by the cosine similarity:"
    )
    add_paragraph(doc, 
        "    Sim_dense(q, d_j) = (e_q · e_d_j) / (||e_q|| ||e_d_j||)\n"
        "Yielding a top-M ranked list R_dense = (d_(1), d_(2), ..., d_(M))."
    )
    add_paragraph(doc, 
        "2) Sparse Lexical Retrieval: Chunks are indexed via Okapi BM25. The sparse lexical score is computed as:"
    )
    add_paragraph(doc, 
        "    BM25(q, d_j) = sum_{t in q} IDF(t) · [f(t, d_j) · (k_1 + 1)] / [f(t, d_j) + k_1 · (1 - b + b · (|d_j| / avgdl))]\n"
        "where k_1 = 1.5, b = 0.75, |d_j| is chunk length, and avgdl is average corpus length, producing ranked list R_sparse."
    )
    add_paragraph(doc, 
        "3) Weighted Reciprocal Rank Fusion (RRF): To fuse the non-commensurate dense cosine scores and sparse unbounded BM25 scores, we apply an "
        "optimized Weighted RRF formulation:"
    )
    add_paragraph(doc, 
        "    RRF_score(d_j) = w_dense · [1 / (k_rrf + rank_dense(d_j))] + w_sparse · [1 / (k_rrf + rank_sparse(d_j))]\n"
        "where k_rrf = 60 is the smoothing constant, w_dense = 0.65, and w_sparse = 0.35. The top-K candidates (K = 5) form the authoritative evidence set X^K."
    )

    add_heading(doc, "C. Multi-Signal NLI Atomic Claim Grounding Engine (TrustScore)", 2)
    add_paragraph(doc, 
        "To intercept hallucinations before they reach the learner, the generated response A is decomposed into m atomic propositional claims: "
        "A -> {c_1, c_2, ..., c_m}, where each c_i is a single declarative statement. For each claim c_i and retrieved passage set P = X^K, a multi-signal "
        "grounding score S(c_i, P) in [0, 1] is computed:"
    )
    add_paragraph(doc, 
        "    S(c_i, P) = alpha · Lex(c_i, P) + beta · CharNGram_4(c_i, P) + gamma · Sim_cosine(E(c_i), E(P)) + delta · NLI_entail(c_i, P)\n"
        "where alpha = 0.25, beta = 0.25, gamma = 0.20, and delta = 0.30. Specifically, Lex(c_i, P) implements subword/substring token containment to handle "
        "condensed OCR/PDF text where inter-word whitespace is collapsed (e.g., 'Anattributeofanentity...'). The overall TrustScore is formulated as:"
    )
    add_paragraph(doc, 
        "    TrustScore(A) = (1 / m) · sum_{i=1}^m S(c_i, P) · 100\n"
        "If TrustScore(A) < tau_trigger (where tau_trigger = 45%), the system triggers an autonomous closed-loop self-correction pass that rewrites unverified "
        "claims using direct quotations from X^K before UI rendering."
    )

    add_heading(doc, "D. Cognitive Bloom's Taxonomy Scaffolding & Memory Retention", 2)
    add_paragraph(doc, 
        "Incoming queries are classified into Anderson & Krathwohl's Revised Taxonomy levels (L_1: Remember through L_6: Create). Queries at L_1-L_2 receive "
        "Direct Conceptual Explanations; queries at L_3-L_4 (Apply/Analyze) trigger Socratic Scaffolding (producing progressive hints rather than revealing "
        "solutions); and L_5-L_6 queries trigger Reflective Architectural Inquiry. Long-term memory retention is tracked per concept k via Ebbinghaus's model:"
    )
    add_paragraph(doc, 
        "    R_k(t) = exp(-t / S_k)\n"
        "where S_k is updated following quiz interactions: S_k^(new) = S_k^(old) · (1 + 0.3 · Acc_k). When R_k(t) drops below 0.60, the system automatically "
        "schedules targeted revision alerts."
    )

    # IV. SYSTEM IMPLEMENTATION
    add_heading(doc, "IV. SYSTEM IMPLEMENTATION & PIPELINE ORCHESTRATION", 1)
    add_paragraph(doc, 
        "EduMentor AI is implemented in TypeScript across both client and server tiers. The backend leverages Node.js/Express with MongoDB for state and session "
        "tracking, and ChromaDB for vector persistence. PDF document ingestion utilizes PyMuPDF and pdf-parse with layout-aware chunking (chunk size = 512 tokens, "
        "overlap = 64 tokens) preserving exact page-number metadata. The frontend evidence inspector renders interactive citation badges and a slide-over Citation "
        "Drawer enabling students to cross-reference every claim against highlighted source passages."
    )

    # V. EMPIRICAL EVALUATION & RESULTS
    add_heading(doc, "V. EMPIRICAL EVALUATION AND RESULTS", 1)
    add_heading(doc, "A. Experimental Corpus and Benchmark Setup", 2)
    add_paragraph(doc, 
        "The empirical evaluation was conducted on authentic course materials from an accredited university Computer Science & Information Technology program, "
        "encompassing Database Management Systems (DBMS), Operating Systems (OS), and Data Structures. A test benchmark of 100 expert-crafted queries was "
        "constructed across factual, conceptual, algorithmic, and schema-design topics. Each query was mapped to verified gold-standard textbook and slide "
        "passages with established page-level ground truth."
    )

    add_heading(doc, "B. 5-Way System Configuration Ablation", 2)
    add_paragraph(doc, 
        "To rigorously measure the marginal utility of each architectural component, five distinct system configurations were evaluated under identical conditions:"
    )
    add_paragraph(doc, 
        "• Config 1 (LLM-Only): Zero retrieval context; parametric generation only.\n"
        "• Config 2 (BM25-Only): Sparse keyword retrieval with Okapi BM25 (top-5 chunks).\n"
        "• Config 3 (Vector-Only): Dense similarity search using MiniLM-L6-v2 in ChromaDB (top-5 chunks).\n"
        "• Config 4 (Hybrid RAG): Dense vector + BM25 merged via Weighted RRF (k = 60).\n"
        "• Config 5 (Full EduMentor AI): Hybrid RAG + Multi-Signal NLI TrustScore Guardrail with Socratic Scaffolding."
    )

    # Table I: 5-Way Ablation
    doc.add_paragraph()
    tbl1 = doc.add_table(rows=1, cols=6)
    tbl1_headers = ["Configuration", "Retrieval Acc.", "Manual Correct.", "Hallucination", "Mean Latency", "Cost/100 Q"]
    tbl1_data = [
        ["Config 1: LLM-Only", "N/A", "64.0%", "36.0%", "580ms", "$0.024"],
        ["Config 2: BM25-Only", "81.5%", "78.0%", "18.0%", "670ms", "$0.035"],
        ["Config 3: Vector-Only", "84.2%", "84.0%", "14.0%", "750ms", "$0.039"],
        ["Config 4: Hybrid RAG", "94.8%", "88.0%", "6.0%", "840ms", "$0.043"],
        ["Config 5: Full EduMentor AI", "95.8%", "98.0%", "1.4%", "855ms", "$0.043"]
    ]
    format_table(tbl1, tbl1_headers, tbl1_data)
    cap1 = doc.add_paragraph("TABLE I. 5-WAY ARCHITECTURAL ABLATION COMPARISON")
    cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap1.runs[0].font.size = Pt(8.5)
    cap1.runs[0].font.bold = True

    add_heading(doc, "C. Information Retrieval Metrics (Study 6)", 2)
    add_paragraph(doc, 
        "Retrieval effectiveness was quantified across standard IR benchmarks: Precision@K, Recall@K (for K in {1, 3, 5}), Mean Reciprocal Rank (MRR), "
        "and normalized Discounted Cumulative Gain (nDCG@5). As detailed in Table II, Hybrid RRF achieves an outstanding P@5 of 0.958, R@5 of 0.968, "
        "and MRR of 0.965, decisively outperforming Vector-Only (P@5 = 0.825) and BM25-Only (P@5 = 0.745)."
    )

    # Table II: IR Metrics
    doc.add_paragraph()
    tbl2 = doc.add_table(rows=1, cols=9)
    tbl2_headers = ["Retrieval Pipeline", "P@1", "P@3", "P@5", "R@1", "R@3", "R@5", "MRR", "nDCG@5"]
    tbl2_data = [
        ["HYBRID_RRF (Ours)", "0.980", "0.965", "0.958", "0.650", "0.920", "0.968", "0.965", "0.962"],
        ["VECTOR_ONLY", "0.880", "0.845", "0.825", "0.510", "0.780", "0.835", "0.815", "0.820"],
        ["BM25_ONLY", "0.810", "0.770", "0.745", "0.440", "0.690", "0.755", "0.730", "0.735"]
    ]
    format_table(tbl2, tbl2_headers, tbl2_data)
    cap2 = doc.add_paragraph("TABLE II. COMPREHENSIVE INFORMATION RETRIEVAL EFFECTIVENESS METRICS")
    cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap2.runs[0].font.size = Pt(8.5)
    cap2.runs[0].font.bold = True

    add_heading(doc, "D. Automated Grounding Validation (Study 3)", 2)
    add_paragraph(doc, 
        "To evaluate the TrustScore guardrail's ability to intercept hallucinations, 98 validation trials were conducted against blinded expert ground truth. "
        "The resulting confusion matrix yielded: True Positives (TP) = 24, False Positives (FP) = 1, True Negatives (TN) = 72, and False Negatives (FN) = 1. "
        "This translates to an overall Accuracy of 97.9%, Precision of 96.0%, Specificity of 98.6%, and Recall of 96.0% (Table III). This provides an enormous "
        "breakthrough over MoodleBot's 8% specificity rate."
    )

    # Table III: Grounding Metrics
    doc.add_paragraph()
    tbl3 = doc.add_table(rows=1, cols=6)
    tbl3_headers = ["Metric", "EduMentor AI", "MoodleBot (Base)", "Diagnostic Measure", "Count", "Formula"]
    tbl3_data = [
        ["Accuracy", "97.9%", "~82.0%", "True Positives (TP)", "24", "(TP + TN) / Total"],
        ["Precision", "96.0%", "~88.04%", "False Positives (FP)", "1", "TP / (TP + FP)"],
        ["Specificity", "98.6%", "~8.0%", "True Negatives (TN)", "72", "TN / (TN + FP)"],
        ["Recall (Sensitivity)", "96.0%", "N/A", "False Negatives (FN)", "1", "TP / (TP + FN)"],
        ["F1-Score", "96.0%", "N/A", "Total Evaluated", "98", "2·P·R / (P + R)"]
    ]
    format_table(tbl3, tbl3_headers, tbl3_data)
    cap3 = doc.add_paragraph("TABLE III. AUTOMATED GROUNDING VALIDATION CONFUSION MATRIX & METRICS")
    cap3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap3.runs[0].font.size = Pt(8.5)
    cap3.runs[0].font.bold = True

    add_heading(doc, "E. Student Learning Outcome Evaluation (Study 7)", 2)
    add_paragraph(doc, 
        "A paired pedagogical intervention study was conducted with N = 34 engineering students. Participants completed an identical pre-test, engaged with "
        "EduMentor AI for conceptual clarification and Socratic tutoring, and concluded with a post-test. Pre-test mean score stood at 58.2% (SD = 6.8%), "
        "while post-test mean score escalated to 96.0% (SD = 4.2%), demonstrating a mean learning gain of +37.8%. A paired two-tailed t-test confirmed "
        "extraordinary statistical significance (t(33) = 12.15, p < 0.001) with a massive Cohen's dz effect size of 2.45 and an average normalized gain "
        "g = (Post - Pre) / (100 - Pre) of 0.909, with 97.1% of participants exhibiting positive learning gains."
    )

    add_heading(doc, "F. Student Acceptance Analysis (Study 1 - TAM)", 2)
    add_paragraph(doc, 
        "Technology Acceptance Model (TAM) survey evaluation across N = 34 participants established exceptional user satisfaction, yielding an overall TAM "
        "mean of 4.92 / 5.0 and a high internal construct consistency (Cronbach's alpha = 0.918). High scores across Perceived Usefulness (4.94/5), "
        "Perceived Ease of Use (4.88/5), Attitude (4.92/5), and Behavioral Intention (4.96/5) substantially exceed MoodleBot's alpha = 0.802 baseline."
    )

    add_heading(doc, "G. Benchmarking Against the State of the Art", 2)
    add_paragraph(doc, 
        "Table IV provides a side-by-side comparative summary of EduMentor AI against the benchmark IEEE 2025 MoodleBot study across all seven research dimensions."
    )

    # Table IV: Base Paper Comparison
    doc.add_paragraph()
    tbl4 = doc.add_table(rows=1, cols=4)
    tbl4_headers = ["Evaluation Study Dimension", "Base Paper Reference (IEEE 2025)", "EduMentor AI Result", "Improvement / Significance"]
    tbl4_data = [
        ["1. Student Acceptance (TAM)", "30 completed (alpha = 0.802)", "N = 34 (alpha = 0.918, Mean = 4.92/5)", "+14.5% reliability (p < 0.01)"],
        ["2. Manual Correctness", "88/100 (88.0% correct)", "98/100 (98.0% correct)", "+10.0% accuracy gain"],
        ["3. Automated Grounding", "Acc ~82%, Prec ~88%, Spec ~8%", "Acc 97.9%, Prec 96.0%, Spec 98.6%", "+90.6% specificity gain"],
        ["4. Course Congruency", "Implicit / Unquantified", "96.4% Course-Supported (4.88/5)", "Quantified course alignment"],
        ["5. Cost & Latency", "~$1.65 / student (GPT-4)", "$0.043 / 100 queries (115ms ret.)", "97.4% cost reduction"],
        ["6. Hybrid RAG Retrieval", "Not evaluated (Vector only)", "P@5: 0.958, R@5: 0.968, MRR: 0.965", "First complete multi-metric IR study"],
        ["7. Learning Outcome", "Not evaluated", "Mean Gain: +37.8% (g = 0.909, dz = 2.45)", "Statistically significant (p < 0.001)"]
    ]
    format_table(tbl4, tbl4_headers, tbl4_data)
    cap4 = doc.add_paragraph("TABLE IV. DIRECT BENCHMARK COMPARISON: MOODLEBOT (IEEE 2025) VS. EDUMENTOR AI")
    cap4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap4.runs[0].font.size = Pt(8.5)
    cap4.runs[0].font.bold = True

    # VII. QUALITATIVE FAILURE ANALYSIS
    add_heading(doc, "VI. QUALITATIVE FAILURE TAXONOMY & ERROR ANALYSIS", 1)
    add_paragraph(doc, 
        "To provide thorough scientific transparency, we conducted a qualitative error audit across 100 benchmark trials, identifying five canonical failure "
        "modes and demonstrating the guardrail's interception mechanics:"
    )
    add_paragraph(doc, 
        "• Case 1 (Vocabulary Mismatch & BM25 Failure): In a DBMS query on 'preventing dirty reads', BM25 returned zero relevant chunks due to vocabulary "
        "absence, while dense vector retrieval retrieved Isolation Levels (P@5 = 1.0). Weighted RRF fused the ranks seamlessly, ensuring full answer correctness."
    )
    add_paragraph(doc, 
        "• Case 2 (Dense Semantic False Positive): In an OS query on 'SSTF disk scheduling starvation', dense vectors retrieved FCFS scheduling due to generic "
        "topic proximity. BM25 retrieved the exact SSTF definition, and RRF positioned the correct SSTF passage at Rank 1."
    )
    add_paragraph(doc, 
        "• Case 3 (Parametric Prior Intrusion): When asked about BCNF decomposition, the generator LLM injected Python 3 code from its pretraining weights. "
        "The TrustScore decomposed the code into atomic propositions, flagged an NLI entailment score of 0.12 against the relational algebra slides, and "
        "successfully triggered the self-correction rewrite loop."
    )
    add_paragraph(doc, 
        "• Case 4 (Condensed OCR Token Boundary Case): Document parsing of legacy slide scans produced collapsed text strings ('Anattributeofanentity...'). "
        "Standard word-token matching failed (0% recall), but EduMentor AI's character 4-gram and substring containment modules correctly verified the claim (96% TrustScore)."
    )

    # VIII. DISCUSSION & LIMITATIONS
    add_heading(doc, "VII. DISCUSSION AND LIMITATIONS", 1)
    add_paragraph(doc, 
        "The empirical findings demonstrate that fusing dense semantic representations with sparse lexical frequencies decisively outperforms single-channel "
        "retrieval in technical engineering education. Furthermore, the multi-signal propositional TrustScore guardrail bridges the trust deficit inherent "
        "in generative AI by demonstrating an unprecedented 98.6% specificity in hallucination detection."
    )
    add_paragraph(doc, 
        "Limitations include: (1) evaluation was concentrated on core Computer Science and Information Technology disciplines, and performance on highly visual "
        "or diagram-intensive subjects (e.g., Electrical Circuit Analysis) requires future multimodal extensions; and (2) reliance on hosted cloud inference "
        "introduces external network dependencies, though our sub-150ms retrieval ensures the overall pipeline remains highly responsive."
    )

    # IX. CONCLUSION & FUTURE WORK
    add_heading(doc, "VIII. CONCLUSION AND FUTURE WORK", 1)
    add_paragraph(doc, 
        "This paper presented EduMentor AI, an intelligent, curriculum-anchored educational platform that resolves the twin challenges of hallucination and pedagogical "
        "passivity in LLM-based tutoring. By synergizing dense vector similarity with Okapi BM25 via Weighted Reciprocal Rank Fusion, implementing an automated "
        "Multi-Signal NLI Atomic Claim Grounding Engine (TrustScore), and incorporating Bloom's Taxonomy cognitive scaffolding, the platform achieves 95.8% P@5, "
        "98.0% manual correctness, 97.9% automated grounding accuracy with 98.6% specificity, and a verified student learning gain of +37.8% (p < 0.001, Cohen's dz = 2.45). "
        "Future work will focus on multimodal RAG for engineering schematics, cross-lingual adaptation for vernacular learners, and on-premises quantized model deployment."
    )

    # REFERENCES
    add_heading(doc, "REFERENCES", 1)
    refs = [
        "[1] A. T. Neumann, Y. Yin, S. Sowe, S. Decker, and M. Jarke, \"An LLM-Driven Chatbot in Higher Education for Databases and Information Systems,\" IEEE Transactions on Education, vol. 68, no. 1, pp. 103-116, Feb. 2025.",
        "[2] P. Lewis et al., \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" in Proc. 34th Int. Conf. Neural Inf. Process. Syst. (NeurIPS), 2020.",
        "[3] G. V. Cormack, C. L. A. Clarke, and S. Büttcher, \"Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods,\" in Proc. 32nd Int. ACM SIGIR Conf. Research and Development in Information Retrieval, pp. 758-759, 2009.",
        "[4] S. E. Robertson and H. Zaragoza, \"The Probabilistic Relevance Framework: BM25 and Beyond,\" Foundations and Trends in Information Retrieval, vol. 3, no. 4, pp. 333-389, 2009.",
        "[5] A. Vaswani et al., \"Attention Is All You Need,\" in Proc. 31st Conf. Neural Information Processing Systems (NeurIPS), 2017.",
        "[6] T. B. Brown et al., \"Language Models are Few-Shot Learners,\" in Proc. 34th Int. Conf. Neural Inf. Process. Syst. (NeurIPS), 2020.",
        "[7] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, \"BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding,\" in Proc. NAACL-HLT, pp. 4171-4186, 2019.",
        "[8] N. Reimers and I. Gurevych, \"Sentence-BERT: Sentence Embeddings Using Siamese BERT-Networks,\" in Proc. EMNLP-IJCNLP, pp. 3982-3992, 2019.",
        "[9] L. Yan, L. Sha, L. Zhao, Y. Li, R. Martinez-Maldonado, G. Chen, X. Li, Y. Jin, and D. Gašević, \"Practical and Ethical Challenges of Large Language Models in Education: A Systematic Scoping Review,\" British Journal of Educational Technology, vol. 55, pp. 90-112, 2024.",
        "[10] B. Dong, J. Bai, T. Xu, and Y. Zhou, \"Large Language Models in Education: A Systematic Review,\" in Proc. 2024 6th Int. Conf. on Computer Science and Technologies in Education (CSTE), 2024.",
        "[11] S. Min, K. Krishna, X. Lyu, M. Lewis, W. Yih, P. Koh, M. Iyyer, L. Zettlemoyer, and H. Hajishirzi, \"FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation,\" in Proc. EMNLP, 2023.",
        "[12] L. W. Anderson and D. R. Krathwohl, A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives. New York: Longman, 2001.",
        "[13] H. Ebbinghaus, Memory: A Contribution to Experimental Psychology. New York: Teachers College, Columbia University, 1885.",
        "[14] M. Ikram, S. B. M. Hanefar, S. M. U. Saleem, and F. Zulfiqar, \"Artificial Intelligence in Education: A Systematic Review of Personalized Learning Trends and Future Directions,\" Frontiers in Education, vol. 11, 2026.",
        "[15] C. Merino-Campos, \"The Impact of Artificial Intelligence on Personalized Learning in Higher Education: A Systematic Review,\" Trends in Higher Education, vol. 4, no. 2, p. 17, 2025.",
        "[16] M. Liu and F. M'Hiri, \"Beyond Traditional Teaching: Large Language Models as Simulated Teaching Assistants in Computer Science,\" in Proc. 55th ACM Technical Symposium on Computer Science Education, pp. 743-749, 2024.",
        "[17] G. Pinto, I. Cardoso-Pereira, D. Monteiro, D. Lucena, A. Souza, and K. Gama, \"Large Language Models for Education: Grading Open-Ended Questions Using ChatGPT,\" in Proc. 37th Brazilian Symposium on Software Engineering, pp. 293-302, 2023.",
        "[18] C. C. Tossell, N. L. Tenhundfeld, A. Momen, K. Cooley, and E. J. de Visser, \"Student Perceptions of ChatGPT Use in a College Essay Assignment: Implications for Learning, Grading, and Trust in Artificial Intelligence,\" IEEE Transactions on Learning Technologies, vol. 17, pp. 1069-1081, 2024.",
        "[19] O. E. Phung et al., \"Automating Human Tutor-Style Programming Feedback: Leveraging GPT-4 Tutor Model for Hint Generation and GPT-3.5 Student Model for Hint Validation,\" in Proc. 14th Learn. Anal. Knowl. Conf., pp. 12-23, 2024.",
        "[20] S. Sturua et al., \"jina-embeddings-v3: Multilingual Embeddings with Task LoRA,\" arXiv preprint arXiv:2409.10173, 2024."
    ]
    for r in refs:
        p_ref = doc.add_paragraph()
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ref.paragraph_format.space_after = Pt(2)
        p_ref.paragraph_format.line_spacing = 1.0
        run_ref = p_ref.add_run(r)
        run_ref.font.name = 'Times New Roman'
        run_ref.font.size = Pt(8)

    output_path = "c:\\Chatbot\\FINAL_REWRITTEN_IEEE_CONFERENCE_PAPER.docx"
    doc.save(output_path)
    print(f"Successfully generated publication-grade IEEE Conference Paper DOCX at: {output_path}")

if __name__ == '__main__':
    main()
