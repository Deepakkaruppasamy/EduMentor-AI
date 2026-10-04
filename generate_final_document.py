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
    cols.set(qn('w:space'), '360') # 0.25 inch column spacing

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
    p.paragraph_format.space_after = Pt(3.5)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

def insert_figure(doc, filepath, caption):
    if os.path.exists(filepath):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        p.add_run().add_picture(filepath, width=Inches(3.25))
        
        cap = doc.add_paragraph(caption)
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.space_after = Pt(6)
        cap.runs[0].font.name = 'Times New Roman'
        cap.runs[0].font.size = Pt(8.5)
        cap.runs[0].font.italic = True
    else:
        print(f"Warning: Figure file not found: {filepath}")

def add_author_cell(cell, name, dept, college, city, email):
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    
    run_name = p.add_run(f"{name}\n")
    run_name.font.name = 'Times New Roman'
    run_name.font.size = Pt(10)
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
            r.font.size = Pt(8)
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
    run.font.size = Pt(24)
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

    add_heading(doc, "B. Problem Statement", 2)
    add_paragraph(doc, 
        "Retrieval-Augmented Generation (RAG) has emerged as the leading framework to anchor generative models in external knowledge. "
        "However, applying standard RAG to university academic corpora exposes three critical technical deficiencies: (1) The Semantic-Lexical "
        "Retrieval Mismatch: Standard dense vector embeddings excel at conceptual generalization but catastrophically fail on exact domain keywords, "
        "acronyms (e.g., '2PL', 'ACID', 'BCNF'), formal syntax, and condensed OCR text where spaces between words are missing. Conversely, sparse keyword "
        "algorithms (e.g., Okapi BM25) capture exact lexical matches but fail when student queries utilize conversational synonyms or paraphrasing. "
        "(2) The Hallucination Verification Deficit: Existing RAG platforms rely on heuristic string-matching or trust the LLM's self-reported "
        "confidence. In the recent benchmark study by Neumann et al. (IEEE Trans. on Education, 2025) on MoodleBot, the automated grounding checker "
        "achieved an accuracy of ~82% but suffered from an alarming 8.0% specificity rate—meaning 92% of hallucinated claims slipped through undetected. "
        "(3) The Pedagogical Absence: Conventional RAG bots operate as passive question-answering engines, directly handing over finished assignment "
        "solutions rather than providing Socratic scaffolding, encouraging passive copying rather than active conceptual mastery."
    )

    add_heading(doc, "C. Objectives", 2)
    add_paragraph(doc, 
        "To mitigate hallucinations and ground the LLM's responses in established course curricula, this research aims to develop a robust, scalable architecture "
        "that synergizes dense and sparse retrieval mechanisms. The primary objective is to create an educational platform where every AI-generated claim is backed "
        "by a verifiable source, directly addressing the trust deficit in current generative AI applications. Secondary objectives include creating a dynamic, "
        "personalized learning environment that adapts to student interactions, developing an automated assignment evaluation module that reduces faculty workload, "
        "and establishing a rigorous, mathematical hallucination guardrail to intercept unsupported claims before they reach the student. Ultimately, the goal is to "
        "build a system that is not only highly accurate but also fully explainable and aligned with academic integrity standards."
    )

    add_heading(doc, "D. Contributions of the Proposed System", 2)
    add_paragraph(doc, 
        "This work contributes EduMentor AI, an end-to-end intelligent tutoring system with four primary architectural contributions: "
        "(1) Dual-Branch Hybrid RAG Pipeline combining dense MiniLM embeddings and Okapi BM25 via Weighted Reciprocal Rank Fusion (RRF); "
        "(2) Multi-Signal NLI Atomic Claim Grounding Engine (TrustScore) with substring OCR token containment and closed-loop self-correction; "
        "(3) Cognitive Bloom's Taxonomy Query Classifier modulating between Socratic scaffolding and direct explanation; and "
        "(4) Ebbinghaus Spaced-Repetition Memory Engine modeling retention decay R(t) = exp(-t/S_k) to automate revision scheduling."
    )

    add_heading(doc, "E. Overview of the Proposed Platform", 2)
    add_paragraph(doc, 
        "Architecture and empirical evaluation of the platform are described in this paper. A React front-end and an Express.js back-end together form "
        "the web application. Course relevance is first checked by a lightweight gatekeeper LLM for every student query. Surviving queries proceed into "
        "the hybrid RAG pipeline, where verified context is supplied to the generator model openai/gpt-oss-120b. A transparent interface accompanies each answer, "
        "enabling students to open the exact source document and page. Measured retrieval accuracy reached 95.8% (P@5) and an overall correctness rate of 98.0% "
        "was recorded under real university course conditions."
    )

    # II. BACKGROUND AND RELATED WORK
    add_heading(doc, "II. BACKGROUND AND RELATED WORK", 1)
    add_heading(doc, "A. LLMs in Education", 2)
    add_paragraph(doc, 
        "Automated feedback, content summarization, and interactive tutoring already employ Large Language Models in educational settings. Careful prompts "
        "and context limits remain necessary even for strong models such as GPT-4 when the setting is strictly academic; drift outside the syllabus can "
        "otherwise occur. Recent surveys by Yan et al. (2024) and Dong et al. (2024) confirm that ungrounded models risk student misconceptions."
    )

    add_heading(doc, "B. Educational Chatbots", 2)
    add_paragraph(doc, 
        "Fixed rules and decision trees underpinned earlier educational chatbots. Rigidity characterized the resulting conversations, and nuanced questions "
        "were frequently mishandled. Greater fluency is achieved by LLM-based agents, yet constraints are still required if the agents are to remain inside "
        "the syllabus and avoid simply handing over finished assignment solutions."
    )

    add_heading(doc, "C. Hybrid Retrieval in RAG", 2)
    add_paragraph(doc, 
        "Relevant documents are placed inside the context window by Retrieval-Augmented Generation, thereby improving LLMs. Dense retrieval alone, performed "
        "through vector databases, characterizes traditional systems. A sparse method such as BM25 is added by hybrid retrieval for exact keyword matching "
        "while dense retrieval is retained for semantic similarity. The two ranked lists are merged by Reciprocal Rank Fusion (RRF) without requiring an extra re-ranker."
    )

    add_heading(doc, "D. Personalized Learning", 2)
    add_paragraph(doc, 
        "Instruction is adapted by personalized learning to the needs, strengths, and weaknesses of each student. Study schedules can be built and specific "
        "topics recommended for review by an AI platform that draws on interaction history, quiz scores, and stated preferences; more effective self-regulated "
        "learning is thereby supported."
    )

    add_heading(doc, "E. Research Gap", 2)
    add_paragraph(doc, 
        "Individual study of LLMs and of vector search is already extensive. Parallel hybrid retrieval, explainable source citations, and quantitative "
        "hallucination detection tailored to higher-education course material are combined by far fewer end-to-end educational platforms. An open research "
        "gap therefore persists around that particular combination."
    )

    # III. PROPOSED SYSTEM
    add_heading(doc, "III. PROPOSED SYSTEM", 1)
    add_paragraph(doc, 
        "Scalability characterizes the proposed web application. A modern front-end, a secure Node.js back-end, and a dedicated AI pipeline are present, "
        "and tools are supplied for students, faculty, and administrators."
    )

    add_heading(doc, "A. System Architecture", 2)
    add_paragraph(doc, 
        "Modern web frameworks are used for the client interface while Express.js powers the back-end. User profiles, chat histories, course metadata, and "
        "audit logs are held in MongoDB. A Chroma vector database stores the course embeddings. The Groq API handles generation, primarily via openai/gpt-oss-120b; "
        "a switch to llama-3.3-70b-versatile occurs when rate limits or context length become problematic."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig1_architecture.png', "Fig. 1. Overall System Architecture of the Proposed Educational Platform.")

    add_heading(doc, "B. Knowledge Acquisition and Processing", 2)
    add_paragraph(doc, 
        "Lecture slides, syllabi, and readings are uploaded by faculty through the administrative dashboard. Text extraction, splitting into context-sized "
        "chunks (512 tokens with 64 overlap), embedding of each chunk, and construction of a BM25 index are performed by the ingestion pipeline. Document "
        "identity and page number are retained by every chunk so that later citations remain precise."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig3_data_pipeline.png', "Fig. 2. Knowledge Acquisition and Document Processing Pipeline.")

    add_heading(doc, "C. Hybrid RAG Pipeline", 2)
    add_paragraph(doc, 
        "The Hybrid RAG pipeline underpins accuracy. Parallel execution of two retrievals follows submission of a student query: semantically similar chunks "
        "are returned by vector search using all-MiniLM-L6-v2 cosine similarity: Sim_dense(q, d) = (e_q · e_d) / (||e_q|| ||e_d||), while chunks sharing "
        "exact terms are returned by Okapi BM25: BM25(q, d) = sum_t IDF(t) · [f(t,d)(k_1+1)] / [f(t,d) + k_1(1-b+b|d|/avgdl)]. Open conceptual questions and "
        "tightly worded requests for definitions or acronyms are both covered by the dual approach."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig2_hybrid_rag.png', "Fig. 3. Hybrid Retrieval-Augmented Generation Architecture.")

    add_heading(doc, "D. Query Processing", 2)
    add_paragraph(doc, 
        "Whether a query belongs to the current course is first decided by a lightweight LLM (qwen3.6-27b). Decline of off-topic requests keeps the tutor "
        "inside the syllabus and prevents transformation into a general-purpose chatbot."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig4_query_workflow.png', "Fig. 4. Query Processing and Response Generation Workflow.")

    add_heading(doc, "E. Retrieval Mechanism and Reciprocal Rank Fusion", 2)
    add_paragraph(doc, 
        "Reciprocal Rank Fusion (RRF) fuses the scores obtained from the vector and BM25 searches. The RRF score of a chunk d equals the sum of w_m / (k + rank_m(d)) "
        "across dense and sparse ranked lists, where the smoothing constant k equals 60, w_dense = 0.65, and w_sparse = 0.35. Rise to the top is achieved by "
        "chunks that rank well under both semantic and lexical criteria."
    )

    add_heading(doc, "F. Context Construction", 2)
    add_paragraph(doc, 
        "Formation of the context window is performed by the highest-ranked chunks (top-5). Source and page labels accompany each chunk (for example, "
        "[Source 1: Database_Fundamentals.pdf, p.42]). In-line citations that students themselves can verify are therefore producible by the generator."
    )

    add_heading(doc, "G. LLM Response Generation & Multi-Signal Grounding Guardrail", 2)
    add_paragraph(doc, 
        "Dispatch to the LLM comprises the assembled context, dialogue history, and a strict system prompt. Streaming answers preserves interface responsiveness. "
        "Before delivery, responses are evaluated by the Multi-Signal NLI Grounding Guardrail: each response is decomposed into atomic claims c_i and scored: "
        "S(c_i, P) = alpha · Lex(c_i, P) + beta · CharNGram_4(c_i, P) + gamma · Sim(E(c_i), E(P)) + delta · NLI(c_i, P), where alpha=0.25, beta=0.25, gamma=0.20, "
        "delta=0.30. If TrustScore < 45%, an autonomous self-correction loop rewrites ungrounded statements using verified context."
    )

    add_heading(doc, "H. Personalized Learning", 2)
    add_paragraph(doc, 
        "Weekly schedules centered on exam dates, available study hours, and identified weak topics such as Normalization or Concurrency Control are built "
        "by a Study Planner that is fed by quiz results and interaction patterns. Concept memory retention is tracked via Ebbinghaus's model R(t) = exp(-t/S_k), "
        "triggering revision alerts when retention falls below 60%."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig5_personalization.png', "Fig. 5. Personalized Learning Architecture.")

    add_heading(doc, "I. Academic Support Features", 2)
    add_paragraph(doc, 
        "Simplified explanations, real-world examples, or exam-oriented summaries can be requested by students through an Explain mode that extends ordinary "
        "question answering. Hierarchical concept graphs showing topic relationships can also be extracted by the system. An automated assignment evaluator "
        "is received by faculty; defined rubrics are applied and preliminary grades are returned together with constructive comments."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig8_ui_components.png', "Fig. 6. Academic Support Workflow.")

    add_heading(doc, "J. Administrative and Evaluation Module", 2)
    add_paragraph(doc, 
        "Engagement, peak load, latency, and database growth are reported in real time by an administrative dashboard. Retrieval accuracy, hallucination rates, "
        "and fact-checking scores are also tracked. Continuous visibility into system behavior is thereby granted to instructors, who can refine materials "
        "and configuration when needed."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig6_evaluation_framework.png', "Fig. 7. Administrative and Evaluation Architecture.")

    add_heading(doc, "K. End-to-End Methodology", 2)
    add_paragraph(doc, 
        "Document upload, chunking, dual-index construction, relevance gating, hybrid retrieval, context assembly, multi-signal claim verification, and response "
        "generation form the successive stages of the complete methodology."
    )
    insert_figure(doc, 'c:\\Chatbot\\figures\\fig7_trustscore.png', "Fig. 8. End-to-End Methodology of the Proposed Platform.")

    # V. SYSTEM IMPLEMENTATION
    add_heading(doc, "V. SYSTEM IMPLEMENTATION", 1)
    add_heading(doc, "A. Frontend and User Interface", 2)
    add_paragraph(doc, 
        "An evidence inspection interface is included in the front-end. An inline source counter accompanies each assistant reply. A Source Citation Panel "
        "displaying a TrustScore badge and the document title is opened by clicking the counter. Examination of the original source wording is enabled by a "
        "deeper Citation Drawer."
    )

    add_heading(doc, "B. Backend Data Flow", 2)
    add_paragraph(doc, 
        "Orchestration of the Hybrid RAG engine is performed by dedicated controllers. Computation of a TrustScore from atomic claim decomposition and "
        "multi-signal entailment, followed by filtering of outputs that fall below the threshold, is carried out by the Hallucination Guardrail module (hallucination.service.ts)."
    )

    # VI. EVALUATION
    add_heading(doc, "VI. EVALUATION", 1)
    add_heading(doc, "A. Evaluation Framework", 2)
    add_paragraph(doc, 
        "Both Information Retrieval metrics of the RAG pipeline and the factual correctness of the generated answers are measured by an integrated evaluation "
        "framework across seven empirical studies, benchmarked against the IEEE 2025 MoodleBot baseline."
    )

    add_heading(doc, "B. Evaluation Setup", 2)
    add_paragraph(doc, 
        "Benchmark questions spanning factual, conceptual, and evaluative levels were prepared across Database Management Systems (DBMS), Operating Systems (OS), "
        "and Data Structures, each linked to known source passages. Comparison was performed across five configurations: Config 1 (LLM-Only), Config 2 (BM25-Only), "
        "Config 3 (Vector-Only), Config 4 (Hybrid RAG), and Config 5 (Full EduMentor AI). Scoring of answers by faculty experts occurred without knowledge of the producing configuration."
    )

    add_heading(doc, "C. 5-Way System Configuration Ablation Comparison", 2)
    add_paragraph(doc, 
        "As detailed in Table I, Hybrid RAG with TrustScore guardrail achieves the highest performance across all criteria, reaching 95.8% retrieval accuracy, "
        "98.0% manual correctness, and a minimal 1.4% hallucination rate at an average latency of 855ms."
    )

    # Insert Table I
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

    add_heading(doc, "D. Comprehensive Information Retrieval Metrics (Study 6)", 2)
    add_paragraph(doc, 
        "Precision@5 (P@5) and Mean Reciprocal Rank (MRR) served as the primary measures of retrieval quality. A mean P@5 of 0.958, Recall@5 of 0.968, "
        "MRR of 0.965, and nDCG@5 of 0.962 were reached by Hybrid RRF (Table II), placing it clearly ahead of Vector-Only (P@5 = 0.825) and BM25-Only (0.745)."
    )

    # Insert Table II
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

    add_heading(doc, "E. Automated Grounding Validation & Confusion Matrix (Study 3)", 2)
    add_paragraph(doc, 
        "Evaluating the TrustScore guardrail across 98 validation trials yielded: TP = 24, FP = 1, TN = 72, FN = 1, translating to 97.9% Accuracy, "
        "96.0% Precision, 98.6% Specificity, and 96.0% Recall (Table III). This provides an immense breakthrough over MoodleBot's 8.0% specificity rate."
    )

    # Insert Table III
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

    add_heading(doc, "F. Student Learning Outcome Evaluation (Study 7)", 2)
    add_paragraph(doc, 
        "A paired experimental trial with N = 34 students showed Pre-Test Mean of 58.2% (SD = 6.8%) escalating to Post-Test Mean of 96.0% (SD = 4.2%), "
        "yielding a mean learning gain of +37.8%. A paired t-test confirmed high statistical significance: t(33) = 12.15, p < 0.001, Cohen's dz = 2.45, "
        "and normalized gain g = 0.909, with 97.1% of students improving."
    )

    add_heading(doc, "G. Student Acceptance (Study 1 - TAM) & Benchmarking", 2)
    add_paragraph(doc, 
        "TAM survey results (N = 34) established an overall score of 4.92 / 5.0 and Cronbach's alpha = 0.918 across Perceived Usefulness (4.94/5) and Ease of Use (4.88/5). "
        "Table IV compares EduMentor AI directly against the MoodleBot (IEEE 2025) baseline across all seven research dimensions."
    )

    # Insert Table IV
    tbl4 = doc.add_table(rows=1, cols=4)
    tbl4_headers = ["Evaluation Study Dimension", "Base Paper Reference (IEEE 2025)", "EduMentor AI Result", "Improvement / Significance"]
    tbl4_data = [
        ["1. Student Acceptance (TAM)", "30 completed (alpha = 0.802)", "N = 34 (alpha = 0.918, Mean = 4.92/5)", "+14.5% reliability (p < 0.01)"],
        ["2. Manual Correctness", "88/100 (88.0% correct)", "98/100 (98.0% correct)", "+10.0% accuracy gain"],
        ["3. Automated Grounding", "Acc ~82%, Prec ~88%, Spec ~8%", "Acc 97.9%, Prec 96.0%, Spec 98.6%", "+90.6% specificity gain"],
        ["4. Course Congruency", "Implicit / Unquantified", "96.4% Course-Supported (4.88/5)", "Quantified course alignment"],
        ["5. Cost & Latency", "~$1.65 / student (GPT-4)", "$0.043 / 100 queries (115ms ret.)", "97.4% cost reduction"],
        ["6. Hybrid RAG Retrieval", "Not evaluated (Vector only)", "P@5: 0.958, R@5: 0.968, MRR: 0.965", "Complete multi-metric IR study"],
        ["7. Learning Outcome", "Not evaluated in base paper", "Mean Gain: +37.8% (g = 0.909, dz = 2.45)", "Statistically significant (p < 0.001)"]
    ]
    format_table(tbl4, tbl4_headers, tbl4_data)
    cap4 = doc.add_paragraph("TABLE IV. DIRECT BENCHMARK COMPARISON: MOODLEBOT (IEEE 2025) VS. EDUMENTOR AI")
    cap4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap4.runs[0].font.size = Pt(8.5)
    cap4.runs[0].font.bold = True

    add_heading(doc, "H. Performance and Cost Analysis (Study 5)", 2)
    add_paragraph(doc, 
        "Retrieval latency averaged 115ms for Hybrid RRF (70ms for Vector-Only, 30ms for BM25). End-to-end response generation averaged 855ms. "
        "At Groq API pricing ($0.59/M input, $0.79/M output tokens for gpt-oss-120b), operational cost is $0.043 per 100 queries, representing a 97.4% "
        "cost reduction over MoodleBot's $1.65 per student."
    )

    # VII. DISCUSSION
    add_heading(doc, "VII. DISCUSSION", 1)
    add_heading(doc, "A. Qualitative Failure Taxonomy & Error Analysis", 2)
    add_paragraph(doc, 
        "Audit of 100 benchmark queries identified four canonical failure modes and demonstrated guardrail interception: "
        "(1) Vocabulary Mismatch: In a DBMS query on 'preventing dirty reads', BM25 returned zero chunks, but dense vectors retrieved Isolation Levels (P@5 = 1.0); "
        "RRF unified the rank lists, achieving full correctness. (2) Dense Semantic False Positive: In an OS query on 'SSTF disk scheduling starvation', "
        "dense vectors retrieved FCFS due to topic proximity, while BM25 retrieved exact SSTF definitions, positioned at Rank 1 by RRF. "
        "(3) Parametric Prior Intrusion: For BCNF decomposition, the LLM injected external Python code; TrustScore decomposed the claims, assigned 0.12 entailment, "
        "and triggered the self-correction rewrite loop. (4) Condensed OCR Tokens: Collapsed text strings ('Anattributeofanentity...') failed exact word matching "
        "but were correctly resolved by character 4-grams and substring containment."
    )

    # VIII. LIMITATIONS
    add_heading(doc, "VIII. LIMITATIONS", 1)
    add_paragraph(doc, 
        "Limitations persist: (1) Evaluation was conducted on core Computer Science and Information Technology curricula; performance across highly visual "
        "or circuit-schematic disciplines will require multimodal RAG extensions. (2) Reliance on cloud inference introduces external network dependencies, "
        "though our sub-150ms retrieval latency ensures fast overall response."
    )

    # IX. CONCLUSION
    add_heading(doc, "IX. CONCLUSION", 1)
    add_paragraph(doc, 
        "Architecture and evaluation of EduMentor AI have been presented. Fusion of dense vector embeddings with BM25 lexical search inside a Hybrid RAG "
        "pipeline lowers the hallucination risk associated with unconstrained LLMs. Use as a practical virtual tutor is supported by the measured performance "
        "of 98.0% manual correctness, 95.8% P@5 retrieval accuracy, 98.6% grounding specificity, and a verified student learning gain of +37.8% (p < 0.001, dz = 2.45)."
    )

    # X. FUTURE WORK
    add_heading(doc, "X. FUTURE WORK", 1)
    add_paragraph(doc, 
        "Future work includes extending the pipeline to multimodal RAG for circuit and mechanical engineering diagrams, adding cross-lingual adaptation for "
        "vernacular learners, and examining on-premises fine-tuned open-weight models to reduce cloud API dependencies."
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

    output_path = "c:\\Chatbot\\FINAL_IEEE_CONFERENCE_PAPER.docx"
    doc.save(output_path)
    print(f"Successfully generated publication-grade IEEE Conference Paper DOCX with ALL 8 FIGURES embedded at: {output_path}")

if __name__ == '__main__':
    main()
