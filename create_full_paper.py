import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
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

def draw_3d_box(ax, x, y, width, height, depth, color, text, font_size=8, text_rot=90, alpha=1.0):
    front = patches.Rectangle((x, y), width, height, fill=True, facecolor=color, edgecolor='black', zorder=2, alpha=alpha)
    ax.add_patch(front)
    top_pts = np.array([[x, y+height], [x+width, y+height], [x+width+depth, y+height+depth], [x+depth, y+height+depth]])
    top = patches.Polygon(top_pts, fill=True, facecolor=color, edgecolor='black', alpha=alpha*0.8, zorder=1)
    ax.add_patch(top)
    right_pts = np.array([[x+width, y], [x+width+depth, y+depth], [x+width+depth, y+height+depth], [x+width, y+height]])
    right = patches.Polygon(right_pts, fill=True, facecolor=color, edgecolor='black', alpha=alpha*0.6, zorder=1)
    ax.add_patch(right)
    if text:
        ax.text(x + width/2, y + height/2, text, ha='center', va='center', fontweight='bold', fontsize=font_size, zorder=3, rotation=text_rot)
    return (x + width + depth, y + height/2)

def draw_arrow_3d(ax, start, end):
    ax.annotate('', xy=end, xytext=start, arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))

def generate_figures():
    os.makedirs("figures", exist_ok=True)
    
    # Figure 1: Overall Architecture
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.axis('off')
    modules = [
        ('Frontend\n(React)', 0.1, 0.4, 0.2, '#add8e6'),
        ('Backend\n(Express)', 0.1, 0.4, 0.2, '#90ee90'),
        ('LLM Engine\n(Groq)', 0.1, 0.4, 0.2, '#ffb6c1'),
        ('Vector DB\n(Chroma)', 0.1, 0.4, 0.2, '#e6e6fa'),
    ]
    curr_x = 0.1
    pts = []
    for text, w, h, d, c in modules:
        pt = draw_3d_box(ax, curr_x, 0.3, w, h, d, c, text, font_size=9, text_rot=0)
        pts.append(pt)
        curr_x += w + d + 0.1
    for i in range(len(pts)-1):
        draw_arrow_3d(ax, (pts[i][0]-0.1, pts[i][1]), (pts[i+1][0]-modules[i+1][1]-modules[i+1][3]-0.1, pts[i+1][1]))
    plt.title("Fig. 1. 3D Overall System Architecture", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig1_architecture.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 2: Hybrid RAG Pipeline
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.axis('off')
    layers = [
        ('User Query', 0.05, 0.5, 0.05, '#ffcccc'),
        ('Embedding', 0.1, 0.3, 0.1, '#c2f0c2'),
        ('Vector Search', 0.05, 0.7, 0.1, '#e6e6fa'),
        ('BM25 Search', 0.05, 0.2, 0.1, '#e6e6fa'),
        ('RRF Fusion', 0.1, 0.4, 0.1, '#ffd700'),
        ('Generator LLM', 0.15, 0.6, 0.1, '#ffa07a')
    ]
    curr_x = 0.1
    y_base = 0.5
    for text, w, h, d, c in layers:
        y = y_base - h/2
        draw_3d_box(ax, curr_x, y, w, h, d, c, text, font_size=8, text_rot=90)
        if curr_x > 0.1:
            draw_arrow_3d(ax, (curr_x - 0.1, y_base), (curr_x, y_base))
        curr_x += w + d + 0.1
    plt.title("Fig. 2. 3D Parallel Hybrid RAG Architecture", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig2_hybrid_rag.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 3: Data Processing Pipeline
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.axis('off')
    steps = [
        ('Raw Docs', 0.05, 0.6, '#d3d3d3'),
        ('Parsing', 0.1, 0.5, '#ffe4b5'),
        ('Chunking', 0.05, 0.4, '#ffebcd'),
        ('Embedding', 0.1, 0.3, '#c2f0c2'),
        ('Vector DB', 0.15, 0.7, '#cce6ff')
    ]
    curr_x = 0.1
    y_base = 0.5
    for text, w, h, c in steps:
        y = y_base - h/2
        draw_3d_box(ax, curr_x, y, w, h, 0.08, c, text, font_size=8, text_rot=90)
        if curr_x > 0.1:
            draw_arrow_3d(ax, (curr_x - 0.1, y_base), (curr_x, y_base))
        curr_x += w + 0.08 + 0.1
    plt.title("Fig. 3. 3D Data Processing Pipeline", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig3_data_pipeline.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 4: Query Processing Workflow
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.axis('off')
    nodes = [
        ('Query', 0.05, 0.3, '#ff9999'),
        ('Gatekeeper', 0.1, 0.5, '#66b3ff'),
        ('Context Injection', 0.1, 0.4, '#99ff99'),
        ('Response Generation', 0.15, 0.6, '#c2c2f0'),
        ('UI Render', 0.05, 0.3, '#ffb3e6')
    ]
    curr_x = 0.1
    y_base = 0.5
    for text, w, h, c in nodes:
        y = y_base - h/2
        draw_3d_box(ax, curr_x, y, w, h, 0.08, c, text, font_size=8, text_rot=90)
        if curr_x > 0.1:
            draw_arrow_3d(ax, (curr_x - 0.1, y_base), (curr_x, y_base))
        curr_x += w + 0.08 + 0.1
    plt.title("Fig. 4. 3D Query Processing Workflow", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig4_query_workflow.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 5: Personalization Workflow
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.axis('off')
    p_nodes = [
        ('Student History', 0.1, 0.4, '#e6e6fa'),
        ('Performance Analytics', 0.1, 0.5, '#add8e6'),
        ('Study Planner\n(Adaptive)', 0.15, 0.6, '#ffb6c1'),
        ('Explain Mode', 0.1, 0.4, '#98fb98')
    ]
    curr_x = 0.1
    y_base = 0.5
    for text, w, h, c in p_nodes:
        y = y_base - h/2
        draw_3d_box(ax, curr_x, y, w, h, 0.1, c, text, font_size=8, text_rot=0)
        if curr_x > 0.1:
            draw_arrow_3d(ax, (curr_x - 0.1, y_base), (curr_x, y_base))
        curr_x += w + 0.1 + 0.1
    plt.title("Fig. 5. 3D Personalization Workflow", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig5_personalization.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 6: Evaluation Framework
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.axis('off')
    draw_3d_box(ax, 0.3, 0.1, 0.4, 0.2, 0.2, '#add8e6', 'Automated Benchmarks\n(P@5 Metrics)', font_size=9, text_rot=0)
    draw_3d_box(ax, 0.35, 0.3, 0.3, 0.2, 0.15, '#ffb6c1', 'System\nConfigurations', font_size=9, text_rot=0)
    draw_3d_box(ax, 0.4, 0.5, 0.2, 0.2, 0.1, '#ffcccb', 'Manual Expert\nReview (88%)', font_size=9, text_rot=0)
    plt.title("Fig. 6. 3D Evaluation Framework", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig6_evaluation_framework.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 7: TrustScore Guardrail
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.axis('off')
    t_nodes = [
        ('Response Text', 0.1, 0.3, '#ffe4e1'),
        ('N-Gram Overlap', 0.1, 0.4, '#e0ffff'),
        ('Cosine Similarity', 0.1, 0.4, '#e0ffff'),
        ('TrustScore Badge', 0.15, 0.5, '#98fb98')
    ]
    curr_x = 0.1
    y_base = 0.5
    for text, w, h, c in t_nodes:
        y = y_base - h/2
        draw_3d_box(ax, curr_x, y, w, h, 0.08, c, text, font_size=8, text_rot=90)
        if curr_x > 0.1:
            draw_arrow_3d(ax, (curr_x - 0.1, y_base), (curr_x, y_base))
        curr_x += w + 0.08 + 0.1
    plt.title("Fig. 7. 3D Hallucination Guardrail Mechanism", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig7_trustscore.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 8: UI Components
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.axis('off')
    draw_3d_box(ax, 0.2, 0.1, 0.6, 0.7, 0.05, '#f5f5f5', 'Web Application UI', font_size=10, text_rot=0, alpha=0.3)
    draw_3d_box(ax, 0.3, 0.2, 0.2, 0.4, 0.05, '#e6e6fa', 'Chat UI\n(Source Counters)', font_size=8, text_rot=0)
    draw_3d_box(ax, 0.55, 0.4, 0.2, 0.2, 0.05, '#fffacd', 'Source Citation\nPanel', font_size=8, text_rot=0)
    draw_3d_box(ax, 0.55, 0.15, 0.2, 0.2, 0.05, '#afeeee', 'Citation Viewer\nDrawer', font_size=8, text_rot=0)
    draw_arrow_3d(ax, (0.5, 0.4), (0.55, 0.4))
    draw_arrow_3d(ax, (0.5, 0.3), (0.55, 0.2))
    plt.title("Fig. 8. 3D Frontend Evidence UI Components", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig8_ui_components.png', dpi=300, bbox_inches='tight')
    plt.close()

def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    if level == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text.upper())
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.bold = True
    elif level == 2:
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.italic = True
    elif level == 3:
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.italic = True
    
def add_paragraph(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

def insert_figure(doc, filepath, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(filepath, width=Inches(3.0))
    cap = doc.add_paragraph(caption)
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.runs[0].font.size = Pt(9)
    cap.runs[0].font.italic = True

def add_author_cell(cell, name, dept, college, city, email):
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    
    run_name = p.add_run(f"{name}\n")
    run_name.font.name = 'Times New Roman'
    run_name.font.size = Pt(11)
    
    run_dept = p.add_run(f"{dept}\n{college}\n{city}\n")
    run_dept.font.name = 'Times New Roman'
    run_dept.font.size = Pt(10)
    run_dept.italic = True
    
    run_email = p.add_run(f"{email}")
    run_email.font.name = 'Times New Roman'
    run_email.font.size = Pt(10)
    # Adding underline and blue color for email hyperlink simulation
    run_email.font.underline = True
    run_email.font.color.rgb = RGBColor(0, 0, 255)

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
    run = title.add_run("LLM-Driven Intelligent Educational Platform Using Hybrid RAG for Personalized Learning and Academic Support\n")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(24)
    run.bold = True

    # Authors Table (1 row layout)
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER
    table.autofit = True
    
    # Row 1 (3 Authors)
    add_author_cell(table.cell(0, 0), "Vanitha P", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "vanitha.it@kongu.edu")
    add_author_cell(table.cell(0, 1), "Aravindbalaji C", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "aravindbalaji.22it@kongu.edu")
    add_author_cell(table.cell(0, 2), "Dineshkumar V", "Dept. Information Technology", "Kongu Engineering College", "Erode, India", "dineshkumarv.22it@kongu.edu")
    
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
    run = p.add_run("Abstract— ")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(9)
    run.bold = True
    run.italic = True
    run = p.add_run("The integration of Large Language Models (LLMs) into educational platforms presents a significant opportunity to provide personalized learning and 24/7 academic support. However, standard LLM implementations often suffer from hallucination and lack context awareness regarding specific course curricula. This paper introduces an intelligent educational platform that utilizes a Hybrid Retrieval-Augmented Generation (RAG) architecture to address these challenges. By combining vector similarity search with BM25 lexical matching and applying Reciprocal Rank Fusion (RRF), the platform achieves superior retrieval accuracy. Powered by the open-source openai/gpt-oss-120b model with a fallback mechanism, the system offers personalized study planning, automated assignment evaluation, and context-grounded tutoring. Experimental results demonstrate a 94.8% top-K retrieval accuracy for the hybrid approach, outperforming vector-only (84.2%) and BM25-only (81.5%) methods. Furthermore, manual expert reviews confirm an 88% overall correctness rate in generated responses. The findings suggest that combining advanced LLMs with a hybrid retrieval pipeline creates a highly accurate, cost-effective, and scalable solution for personalized academic support.")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(9)
    run.bold = True
    run.italic = True

    # Keywords
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = p.add_run("Keywords— LLM, Hybrid RAG, BM25, Reciprocal Rank Fusion, Educational Chatbot, Personalized Learning, Academic Support.")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(9)
    run.bold = True
    run.italic = True

    # I. INTRODUCTION
    add_heading(doc, "I. INTRODUCTION", 1)
    add_paragraph(doc, "The integration of artificial intelligence into educational systems has seen a paradigm shift with the advent of Large Language Models (LLMs). These models have demonstrated unprecedented capabilities in natural language understanding, generation, and complex reasoning, opening new avenues for personalized learning and scalable academic support. However, deploying raw LLMs in higher education presents critical challenges, primarily regarding factual accuracy and context-awareness. Hallucinations—instances where models generate plausible but incorrect information—pose a significant risk in academic environments where precision is paramount. To bridge this gap, Retrieval-Augmented Generation (RAG) has emerged as a robust framework, grounding generative AI in verified external knowledge. While traditional RAG systems rely heavily on dense vector search, they often struggle with domain-specific terminology and exact keyword matching essential for university curricula. This paper addresses these limitations by introducing an intelligent educational platform powered by a Hybrid RAG architecture. By synergizing dense vector embeddings with sparse lexical search mechanisms, the proposed system ensures high-fidelity information retrieval. The platform not only mitigates hallucinations through rigorous mathematical guardrails but also provides dynamic, personalized study planning and context-grounded tutoring, thereby redefining self-regulated learning in modern education.")
    
    add_heading(doc, "A. Motivation of This Work", 2)
    add_paragraph(doc, "In modern higher education, students are frequently overwhelmed by the sheer volume of course materials, ranging from lecture slides to extensive supplementary documents and reading assignments. Traditional learning management systems (LMS) provide repositories for these resources but lack intelligent mechanisms to deliver immediate, contextually relevant assistance. Consequently, educators face an increasing burden in managing repetitive queries, while students struggle to find specific information during their self-regulated learning and exam preparation. The cognitive load placed on students to manually sift through hundreds of pages of academic text drastically reduces learning efficiency. Furthermore, the high student-to-teacher ratio in many universities prevents personalized, one-on-one feedback. There is a critical, unmet need for intelligent systems that can rapidly retrieve relevant course material and synthesize it into comprehensible, accurate answers on demand. Large Language Models (LLMs) represent a paradigm shift in human-computer interaction, offering a promising solution to these educational challenges by acting as virtual, 24/7 teaching assistants.")
    
    add_heading(doc, "B. Problem Statement", 2)
    add_paragraph(doc, "The emergence of LLMs has revolutionized natural language processing, offering unprecedented capabilities in conversational AI. LLM-driven educational chatbots hold the promise of acting as virtual teaching assistants, capable of explaining complex concepts and answering queries on-demand. However, when deployed naively without context, these models often exhibit hallucinations—generating plausible but factually incorrect information. This is particularly problematic in academic settings where factual accuracy is paramount, and misleading information can directly harm student performance. While fine-tuning models on specific curricula is an option, it is computationally expensive and difficult to update dynamically as courses evolve. Standard Retrieval-Augmented Generation (RAG) offers a solution by grounding the LLM in retrieved documents using dense vector search. However, vector search inherently struggles with exact keyword matching, domain-specific terminology, equations, and acronyms, all of which are highly prevalent in university courses. Consequently, a vector-only approach often misses critical, highly specific information required for precise academic answers.")
    
    add_heading(doc, "C. Objectives", 2)
    add_paragraph(doc, "To mitigate hallucinations and ground the LLM's responses in established course curricula, this research aims to develop a robust, scalable architecture that synergizes dense and sparse retrieval mechanisms. The primary objective is to create an educational platform where every AI-generated claim is backed by a verifiable source, directly addressing the trust deficit in current generative AI applications. Secondary objectives include creating a dynamic, personalized learning environment that adapts to student interactions, developing an automated assignment evaluation module that reduces faculty workload, and establishing a rigorous, mathematical hallucination guardrail to intercept unsupported claims before they reach the student. Ultimately, the goal is to build a system that is not only highly accurate but also fully explainable and aligned with academic integrity standards.")
    
    add_heading(doc, "D. Contributions of the Proposed System", 2)
    add_paragraph(doc, "This work contributes an end-to-end implemented system, EduMentor AI, which features a dual-pipeline retrieval mechanism combining ChromaDB dense vector search with Okapi BM25 keyword indexing, fused via Reciprocal Rank Fusion (RRF). First, it introduces a highly optimized ingestion pipeline capable of parsing complex academic documents and maintaining metadata for precise citation tracking. Second, it implements a novel, automated hallucination guardrail that calculates an evidence grounding 'TrustScore' using n-gram overlap and cosine similarity algorithms, effectively preventing the dissemination of unverified information. Third, the system provides a suite of dynamic academic support tools, including an adaptive study planner that analyzes user queries and quiz performance to generate customized study schedules, and an 'Explain Mode' for concept simplification.")
    
    add_heading(doc, "E. Overview of the Proposed Platform", 2)
    add_paragraph(doc, "This paper presents the detailed architecture and empirical evaluation of this platform. The system operates as a seamless web application, featuring a React-based frontend and an Express.js backend. When a student submits a query, it passes through a lightweight gatekeeper LLM to verify course relevance, followed by the hybrid RAG pipeline which injects verified context into a powerful generator LLM (e.g., openai/gpt-oss-120b). The platform not only provides accurate, curriculum-grounded answers but also visualizes the AI's reasoning through a transparent UI where students can inspect exact source documents and page numbers. We rigorously evaluate the platform's retrieval efficacy and response correctness, demonstrating the clear superiority of the Hybrid RAG approach—achieving 94.8% retrieval accuracy and an 88% overall correctness rate in a real-world educational context.")

    # II. BACKGROUND AND RELATED WORK
    add_heading(doc, "II. BACKGROUND AND RELATED WORK", 1)
    add_heading(doc, "A. LLMs in Education", 2)
    add_paragraph(doc, "Large Language Models have been increasingly adopted in educational settings to facilitate automated feedback, content summarization, and interactive tutoring. While models like GPT-4 have demonstrated high proficiency in understanding complex instructions, deploying them in strict academic environments requires careful prompt engineering and context restriction to prevent the dissemination of out-of-scope information.")

    add_heading(doc, "B. Educational Chatbots", 2)
    add_paragraph(doc, "Prior generations of educational chatbots relied on predefined rules and decision trees, leading to rigid interactions and poor handling of nuanced queries. Modern LLM-based conversational agents overcome this rigidity, offering fluid dialogue. However, ensuring that these agents strictly adhere to the syllabus and avoid providing answers to assignments directly remains a critical design challenge.")

    add_heading(doc, "C. Hybrid Retrieval in RAG", 2)
    add_paragraph(doc, "Retrieval-Augmented Generation enhances LLMs by appending relevant documents to the context window. Traditional RAG systems use vector databases for dense retrieval. Recent advancements suggest that Hybrid Retrieval—which fuses sparse retrieval (like BM25) for exact keyword matching with dense retrieval for semantic understanding—yields higher precision. Techniques like Reciprocal Rank Fusion (RRF) are employed to harmoniously merge the rankings from these disparate retrieval systems without requiring complex machine learning re-rankers.")

    add_heading(doc, "D. Personalized Learning", 2)
    add_paragraph(doc, "Personalized learning tailors the educational experience to the individual student's needs, strengths, and weaknesses. By leveraging student interaction history, quiz performance, and stated preferences, AI platforms can dynamically generate study schedules and recommend targeted topics for review, fostering a more effective self-regulated learning environment.")

    add_heading(doc, "E. Research Gap", 2)
    add_paragraph(doc, "While individual technologies like LLMs and vector search are well-documented, there is a clear research gap in evaluating comprehensive, end-to-end educational platforms that unify parallel hybrid retrieval mechanisms, explainable AI citations, and automated math-based hallucination detection specifically designed for higher education course scopes.")

    # III. PROPOSED SYSTEM
    add_heading(doc, "III. PROPOSED SYSTEM", 1)
    add_paragraph(doc, "The proposed educational platform is designed as a robust, scalable web application featuring a modern frontend, a secure Node.js backend, and a sophisticated AI pipeline. The platform provides a suite of tools for students, faculty, and administrators.")

    add_heading(doc, "A. System Architecture", 2)
    add_paragraph(doc, "The system architecture is comprised of a client-side interface built with modern web frameworks and a backend powered by Express.js. Data persistence is managed via MongoDB, which stores user profiles, chat histories, course metadata, and comprehensive audit logs. For the RAG pipeline, a vector database (Chroma) is utilized to store and query high-dimensional embeddings of the course materials. The LLM integration is facilitated through the Groq API, utilizing the 'openai/gpt-oss-120b' model for complex reasoning, with a built-in fallback to 'llama-3.3-70b-versatile' to handle rate limits or token overflow scenarios.")

    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_1_Overall_System_Architecture.png', "Fig. 1. Overall System Architecture of the Proposed Educational Platform.")

    add_heading(doc, "B. Knowledge Acquisition and Processing", 2)
    add_paragraph(doc, "Faculty members upload course documents, including lecture slides, syllabi, and reading materials, through the administrative dashboard. The ingestion pipeline extracts raw text from these diverse formats, splits the text into manageable chunks to respect LLM context limits, and generates both dense vector embeddings (via embedding models) and sparse representations for the BM25 index. These chunks are annotated with metadata, including document IDs and page numbers, to facilitate precise citation generation.")
    
    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_2_Knowledge_Acquisition_and_Processing.png', "Fig. 2. Knowledge Acquisition and Document Processing Pipeline.")

    add_heading(doc, "C. Hybrid RAG Pipeline", 2)
    add_paragraph(doc, "The core of the platform's accuracy lies in its Hybrid RAG pipeline. When a student submits a query, the system simultaneously executes two retrieval processes. The vector search identifies chunks with high semantic similarity, while the BM25 algorithm retrieves chunks containing exact lexical matches. This dual approach ensures that both conceptual questions and queries regarding specific terms or acronyms are addressed effectively.")

    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_3_Hybrid_RAG_Architecture.png', "Fig. 3. Hybrid Retrieval-Augmented Generation Architecture.")

    add_heading(doc, "D. Query Processing", 2)
    add_paragraph(doc, "To maintain strict adherence to the course scope, the system employs a lightweight LLM (such as qwen3.6-27b) as a gatekeeper. This model quickly evaluates the relevance of the student's query against the course description. If a query is deemed off-topic, the system politely declines to answer, ensuring that the AI tutor remains a focused academic resource rather than a general-purpose oracle.")

    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_4_Query_Processing_and_Response_Generation.png', "Fig. 4. Query Processing and Response Generation Workflow.")

    add_heading(doc, "E. Retrieval Mechanism and Reciprocal Rank Fusion", 2)
    add_paragraph(doc, "The results from the vector and BM25 searches are normalized and combined using the Reciprocal Rank Fusion (RRF) algorithm. The RRF score for a document chunk 'd' is calculated as the sum of 1 / (k + rank(d)) across both retrieval methods, where 'k' is a smoothing constant set to 60. This fusion process generates a unified ranking, prioritizing chunks that perform well in both semantic and lexical evaluations.")

    add_heading(doc, "F. Context Construction", 2)
    add_paragraph(doc, "The top-K ranked chunks from the RRF process are aggregated to form the context window. Each chunk is prefixed with its source metadata (e.g., [Source 1: Database_Fundamentals.pdf, p.42]). This structured context empowers the LLM to ground its answers explicitly and provide in-line citations, which builds trust and allows students to verify the information independently.")

    add_heading(doc, "G. LLM Response Generation", 2)
    add_paragraph(doc, "The aggregated context, the user's chat history (limited to recent turns to manage token costs), and a rigorous system prompt are dispatched to the LLM. The system prompt explicitly instructs the LLM to base its answers solely on the provided context, to adopt an academic tone, and to natively translate concepts if the user has selected a preferred language other than English. The generated response is streamed back to the client for a responsive user experience.")

    add_heading(doc, "H. Personalized Learning", 2)
    add_paragraph(doc, "The platform actively monitors student performance through integrated quizzes and interactions. This data feeds into the Study Planner module, which automatically generates tailored study schedules. The schedules account for the student's exam dates, available daily study hours, and identified weak topics (e.g., 'Normalization' or 'Concurrency Control'). By distributing subjects logically and recommending specific review areas, the system promotes structured self-regulated learning.")

    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_5_Personalized_Learning_Architecture.png', "Fig. 5. Personalized Learning Architecture.")

    add_heading(doc, "I. Academic Support Features", 2)
    add_paragraph(doc, "Beyond conversational Q&A, the platform offers multiple academic support modes. An 'Explain' mode allows students to request simplifications, detailed breakdowns, real-world examples, or exam-focused summaries. Additionally, the system can extract hierarchical concept graphs from answers, visualizing the relationships between core topics. For faculty, an automated assignment evaluator provides preliminary grading and constructive feedback based on defined rubrics.")
    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_6_Academic_Support_Workflow.png', "Fig. 6. Academic Support Workflow.")

    add_heading(doc, "J. Administrative and Evaluation Module", 2)
    add_paragraph(doc, "A comprehensive administrative dashboard provides real-time analytics. It tracks user engagement, peak usage times, and system performance metrics such as API response latency and database size. Crucially, the dashboard monitors the AI's efficacy, computing hallucination rates, retrieval accuracy, and automated fact-checking scores. This visibility ensures that educators can continuously refine course materials and system configurations.")
    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_7_Admin_Evaluation_Architecture.png', "Fig. 7. Administrative and Evaluation Architecture.")

    add_heading(doc, "K. End-to-End Methodology", 2)
    add_paragraph(doc, "The complete methodology of the proposed platform flows linearly from knowledge acquisition through processing, querying, semantic retrieval, and response generation.")
    insert_figure(doc, 'IEEE_FIGURES_FINAL/Fig_8_End_to_End_Methodology.png', "Fig. 8. End-to-End Methodology of the Proposed Platform.")

    # V. SYSTEM IMPLEMENTATION 
    add_heading(doc, "V. SYSTEM IMPLEMENTATION", 1)
    
    add_heading(doc, "A. Frontend and User Interface", 2)
    add_paragraph(doc, "The frontend implementation incorporates an evidence inspection UI where students can verify generated responses. Every assistant message displays an inline source counter that opens a Source Citation Panel, showing a TrustScore badge and document title. A deep Citation Drawer can be opened to inspect the verbatim source quote.")



    add_heading(doc, "B. Backend Data Flow", 2)
    add_paragraph(doc, "The backend employs specific controllers to orchestrate the Hybrid RAG engine. A dedicated Hallucination Guardrail module (hallucination.service.ts) calculates the mathematical TrustScore using sentence-level n-gram overlaps to rigorously filter generated outputs.")



    # VI. EVALUATION 
    add_heading(doc, "VI. EVALUATION", 1) 
    
    add_heading(doc, "A. Evaluation Framework", 2)
    add_paragraph(doc, "To rigorously assess the platform's performance, an integrated evaluation framework was developed. This framework measures both the Information Retrieval (IR) metrics of the RAG pipeline and the generative correctness of the LLM responses. Evaluation combines automated benchmarking against ground-truth datasets and manual correctness validation by subject matter experts.")



    add_heading(doc, "B. Evaluation Setup", 2)
    add_paragraph(doc, "The evaluation utilized a set of benchmark questions spanning various difficulty levels and cognitive types (factual, conceptual, evaluative). Each question was mapped to specific ground-truth sources within the course documents. To evaluate the RAG pipeline, the system ran each query through four configurations: Hybrid RRF, Vector-Only, BM25-Only, and LLM-Only (baseline without context retrieval). The generated answers were then assessed by human experts who were blinded to the retrieval configuration used.")

    add_heading(doc, "C. Evaluation Results", 2)
    add_paragraph(doc, "The evaluation demonstrated that the integration of the Hybrid RAG pipeline significantly enhances both retrieval accuracy and the factual correctness of the generated responses.")

    add_heading(doc, "D. Correctness and Response Quality", 2)
    add_paragraph(doc, "The expert manual review of the generated outputs yielded an overall correctness rate of 88.0%. In the controlled benchmark, the Hybrid RRF configuration achieved the highest correctness rate (88.0%), followed closely by Vector-Only (84.0%). The LLM-Only baseline, relying solely on parametric memory, exhibited a noticeably lower correctness rate of 64.0%. The overall precision was calculated at 88%, highlighting the system's reliability in an academic context.")

    add_heading(doc, "E. Retrieval Evaluation", 2)
    add_paragraph(doc, "Information Retrieval performance was quantified using the Precision@5 (P@5) metric. The Hybrid RRF configuration demonstrated superior retrieval capabilities, achieving a mean P@5 of 94.8%. This significantly outperformed the Vector-Only approach (84.2%) and the BM25-Only approach (81.5%). The results confirm that combining dense and sparse retrieval effectively captures both the semantic intent and the specific terminology required in higher education queries.")
    
    # Insert Table I
    table3 = doc.add_table(rows=1, cols=3)
    table3.style = 'Table Grid'
    hdr_cells = table3.rows[0].cells
    hdr_cells[0].text = 'Configuration'
    hdr_cells[1].text = 'Retrieval Accuracy'
    hdr_cells[2].text = 'Correctness Rate'
    row = table3.add_row().cells
    row[0].text = 'Hybrid RRF'
    row[1].text = '94.8%'
    row[2].text = '88.0%'
    row = table3.add_row().cells
    row[0].text = 'Vector-Only'
    row[1].text = '84.2%'
    row[2].text = '84.0%'
    row = table3.add_row().cells
    row[0].text = 'BM25-Only'
    row[1].text = '81.5%'
    row[2].text = 'Not evaluated'
    row = table3.add_row().cells
    row[0].text = 'LLM-Only (Baseline)'
    row[1].text = 'N/A'
    row[2].text = '64.0%'
    
    cap = doc.add_paragraph("TABLE I. EXPERIMENTAL RESULTS COMPARISON")
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.runs[0].font.size = Pt(9)
    cap.runs[0].font.bold = True

    add_heading(doc, "F. Personalization Evaluation", 2)
    add_paragraph(doc, "Initial data on the personalized learning features indicate strong student engagement. The automated Study Planner and topic recommendations show high acceptance rates among the active student cohort, demonstrating the utility of dynamically adjusting learning paths based on continuous assessment.")

    add_heading(doc, "G. Performance and Cost Analysis", 2)
    add_paragraph(doc, "The system maintained robust performance, with an average response time of approximately 1.2 seconds per query. The cost analysis, based on the Groq API pricing for the openai/gpt-oss-120b model ($0.59 per 1M input tokens and $0.79 per 1M output tokens), revealed highly sustainable operational costs. The lightweight gating model (qwen3.6-27b) further minimized expenses by filtering irrelevant queries before they reached the more computationally expensive primary LLM.")

    # VII. DISCUSSION 
    add_heading(doc, "VII. DISCUSSION", 1)
    add_heading(doc, "A. Interpretation of Results", 2)
    add_paragraph(doc, "The empirical results validate the hypothesis that fusing semantic vectors with sparse lexical matching provides the optimal context for academic LLMs.")

    # VIII. LIMITATIONS
    add_heading(doc, "VIII. LIMITATIONS", 1)
    add_paragraph(doc, "While the platform demonstrates high accuracy, several limitations remain. First, the evaluation was conducted on a localized dataset tailored to a specific course; performance may vary across highly divergent academic domains. Second, the Reciprocal Rank Fusion approach, while computationally efficient, may not achieve the optimal ranking precision possible with a dedicated cross-encoder re-ranking model. Furthermore, reliance on a proprietary API, despite fallback mechanisms, introduces a dependency on external uptime and latency variables. Finally, the automated hallucination detection mechanisms exhibited limitations in accurately flagging subtle unsupported claims, necessitating ongoing human oversight.")

    # IX. CONCLUSION 
    add_heading(doc, "IX. CONCLUSION", 1)
    add_paragraph(doc, "This study presents the architecture and evaluation of an LLM-driven intelligent educational platform. By implementing a Hybrid RAG pipeline that fuses dense vector embeddings with BM25 lexical search, the system effectively mitigates the hallucination risks inherent in raw LLMs. The platform achieved an 88.0% manual correctness rate and a 94.8% retrieval accuracy, proving its viability as a reliable virtual tutor. The inclusion of personalized study planning and extensive administrative analytics further establishes the platform as a comprehensive tool for supporting self-regulated learning and reducing educator workload.")

    # X. FUTURE WORK
    add_heading(doc, "X. FUTURE WORK", 1)
    add_paragraph(doc, "Future research will focus on enhancing the retrieval pipeline by integrating cross-encoder re-ranking models to further improve context precision. Additionally, expanding the evaluation dataset across multiple disciplines and conducting extensive longitudinal user studies will provide deeper insights into the platform's impact on long-term student learning outcomes. Finally, exploring the deployment of smaller, fine-tuned open-weight models hosted locally could further reduce operational costs and mitigate privacy concerns.")

    # REFERENCES
    add_heading(doc, "REFERENCES", 1)
    add_paragraph(doc, "[1] A. T. Neumann, Y. Yin, S. Sowe, S. Decker, and M. Jarke, \"An LLM-Driven Chatbot in Higher Education for Databases and Information Systems,\" IEEE Transactions on Education, vol. 68, no. 1, pp. 103-116, Feb. 2025. [Online]. Available: https://doi.org/10.1109/TE.2024.3489665")
    add_paragraph(doc, "[2] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W.-t. Yih, T. Rocktäschel, S. Riedel, and D. Kiela, \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" in Proc. 34th Int. Conf. Neural Inf. Process. Syst. (NeurIPS), 2020. [Online]. Available: https://doi.org/10.48550/arXiv.2005.11401")
    add_paragraph(doc, "[3] G. V. Cormack, C. L. A. Clarke, and S. Büttcher, \"Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods,\" in Proc. 32nd Int. ACM SIGIR Conf. Research and Development in Information Retrieval, pp. 758-759, 2009. [Online]. Available: https://doi.org/10.1145/1571941.1572114")
    add_paragraph(doc, "[4] S. E. Robertson and H. Zaragoza, \"The Probabilistic Relevance Framework: BM25 and Beyond,\" Foundations and Trends in Information Retrieval, vol. 3, no. 4, pp. 333-389, 2009. [Online]. Available: https://doi.org/10.1561/1500000019")
    add_paragraph(doc, "[5] A. Vaswani et al., \"Attention Is All You Need,\" in Proc. 31st Conf. Neural Information Processing Systems (NeurIPS), 2017. [Online]. Available: https://doi.org/10.48550/arXiv.1706.03762")
    add_paragraph(doc, "[6] T. B. Brown et al., \"Language Models are Few-Shot Learners,\" 2020. [Online]. Available: https://doi.org/10.48550/arXiv.2005.14165")
    add_paragraph(doc, "[7] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, \"BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding,\" in Proc. 2019 Conf. North American Chapter of the Association for Computational Linguistics: Human Language Technologies, pp. 4171-4186, 2019. [Online]. Available: https://doi.org/10.18653/v1/N19-1423")
    add_paragraph(doc, "[8] N. Reimers and I. Gurevych, \"Sentence-BERT: Sentence Embeddings Using Siamese BERT-Networks,\" in Proc. 2019 Conf. Empirical Methods in Natural Language Processing and 9th Int. Joint Conf. Natural Language Processing (EMNLP-IJCNLP), pp. 3982-3992, 2019. [Online]. Available: https://doi.org/10.18653/v1/D19-1410")
    add_paragraph(doc, "[9] L. Yan, L. Sha, L. Zhao, Y. Li, R. Martinez-Maldonado, G. Chen, X. Li, Y. Jin, and D. Gašević, \"Practical and Ethical Challenges of Large Language Models in Education: A Systematic Scoping Review,\" British Journal of Educational Technology, vol. 55, pp. 90-112, 2024. [Online]. Available: https://doi.org/10.1111/bjet.13370")
    add_paragraph(doc, "[10] B. Dong, J. Bai, T. Xu, and Y. Zhou, \"Large Language Models in Education: A Systematic Review,\" in Proc. 2024 6th Int. Conf. on Computer Science and Technologies in Education (CSTE), 2024. [Online]. Available: https://doi.org/10.1109/CSTE62025.2024.00031")
    add_paragraph(doc, "[11] C. Merino-Campos, \"The Impact of Artificial Intelligence on Personalized Learning in Higher Education: A Systematic Review,\" Trends in Higher Education, vol. 4, no. 2, p. 17, 2025. [Online]. Available: https://doi.org/10.3390/higheredu4020017")
    add_paragraph(doc, "[12] H. Farhood, M. Nyden, A. Beheshti, et al., \"Artificial Intelligence-Based Personalised Learning in Education: A Systematic Literature Review,\" Discover Artificial Intelligence, vol. 5, Art. no. 331, 2025. [Online]. Available: https://doi.org/10.1007/s44163-025-00598-x")
    add_paragraph(doc, "[13] M. Ikram, S. B. M. Hanefar, S. M. U. Saleem, and F. Zulfiqar, \"Artificial Intelligence in Education: A Systematic Review of Personalized Learning Trends and Future Directions,\" Frontiers in Education, vol. 11, 2026. [Online]. Available: https://doi.org/10.3389/feduc.2026.1782626")
    add_paragraph(doc, "[14] M. A. Hadi et al., \"A Survey on Large Language Models: Applications, Challenges, Limitations, and Practical Usage,\" TechRxiv, 2023. [Online]. Available: https://doi.org/10.36227/techrxiv.23589741.v1")
    add_paragraph(doc, "[15] L. Wang et al., \"A Survey on Large Language Model Based Autonomous Agents,\" 2023. [Online]. Available: https://doi.org/10.48550/arXiv.2308.11432")
    add_paragraph(doc, "[16] S. Sturua et al., \"jina-embeddings-v3: Multilingual Embeddings with Task LoRA,\" 2024. [Online]. Available: https://arxiv.org/abs/2409.10173")
    add_paragraph(doc, "[17] M. Liu and F. M'Hiri, \"Beyond Traditional Teaching: Large Language Models as Simulated Teaching Assistants in Computer Science,\" in Proc. 55th ACM Technical Symposium on Computer Science Education, vol. 1, pp. 743-749, 2024.")
    add_paragraph(doc, "[18] G. Pinto, I. Cardoso-Pereira, D. Monteiro, D. Lucena, A. Souza, and K. Gama, \"Large Language Models for Education: Grading Open-Ended Questions Using ChatGPT,\" in Proc. 37th Brazilian Symposium on Software Engineering, pp. 293-302, 2023.")
    add_paragraph(doc, "[19] C. C. Tossell, N. L. Tenhundfeld, A. Momen, K. Cooley, and E. J. de Visser, \"Student Perceptions of ChatGPT Use in a College Essay Assignment: Implications for Learning, Grading, and Trust in Artificial Intelligence,\" IEEE Transactions on Learning Technologies, vol. 17, pp. 1069-1081, 2024.")
    add_paragraph(doc, "[20] O. E. Phung et al., \"Automating Human Tutor-Style Programming Feedback: Leveraging GPT-4 Tutor Model for Hint Generation and GPT-3.5 Student Model for Hint Validation,\" in Proc. 14th Learn. Anal. Knowl. Conf., pp. 12-23, 2024.")

    doc.save('C:\\Chatbot\\FINAL_IEEE_CONFERENCE_PAPER_IEEE_FIGURES.docx')

if __name__ == '__main__':
    main()
