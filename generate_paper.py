import os
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def create_element(name):
    return OxmlElement(name)

def create_attribute(element, name, value):
    element.set(qn(name), value)

def set_number_of_columns(section, num_cols):
    sectPr = section._sectPr
    cols = sectPr.xpath('./w:cols')[0]
    cols.set(qn('w:num'), str(num_cols))
    cols.set(qn('w:space'), '720') # 0.5 inch spacing

doc = Document()

# Set to two columns (IEEE format)
section = doc.sections[0]
set_number_of_columns(section, 2)
# Set margins to 0.75 inches
section.top_margin = Inches(0.75)
section.bottom_margin = Inches(0.75)
section.left_margin = Inches(0.63)
section.right_margin = Inches(0.63)

# Title
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("LLM-Driven Intelligent Educational Platform Using Hybrid RAG for Personalized Learning and Academic Support\n")
run.font.name = 'Times New Roman'
run.font.size = Pt(24)
run.bold = True

# Authors
authors = doc.add_paragraph()
authors.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Add the author in standard IEEE 5-line format
author_run = authors.add_run("Deepak Karuppasamy\n")
author_run.font.name = 'Times New Roman'
author_run.font.size = Pt(11)

dept_run = authors.add_run("Dept. of Computer Science and Engineering\n")
dept_run.font.name = 'Times New Roman'
dept_run.font.size = Pt(10)
dept_run.italic = True

inst_run = authors.add_run("EduMentor-AI Project\n")
inst_run.font.name = 'Times New Roman'
inst_run.font.size = Pt(10)
inst_run.italic = True

loc_run = authors.add_run("City, Country\n")
loc_run.font.name = 'Times New Roman'
loc_run.font.size = Pt(10)
loc_run.italic = True

email_run = authors.add_run("deepakkaruppasamy@example.com\n")
email_run.font.name = 'Times New Roman'
email_run.font.size = Pt(10)
email_run.italic = False

def add_heading(text, level=1):
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

def add_paragraph(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

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

add_heading("I. INTRODUCTION", 1)
add_paragraph("In modern higher education, students are frequently overwhelmed by the sheer volume of course materials, ranging from lecture slides to extensive supplementary documents. Traditional learning management systems (LMS) provide repositories for these resources but lack intelligent mechanisms to deliver immediate, contextually relevant assistance. Consequently, educators face an increasing burden in managing repetitive queries, while students struggle to find specific information during their self-regulated learning and exam preparation.")
add_paragraph("The emergence of Large Language Models (LLMs) has revolutionized natural language processing, offering unprecedented capabilities in conversational AI. LLM-driven educational chatbots hold the promise of acting as virtual teaching assistants, capable of explaining complex concepts and answering queries on-demand. However, when deployed naively, these models often exhibit hallucinations, generating plausible but factually incorrect information. This is particularly problematic in academic settings where factual accuracy is paramount.")
add_paragraph("To mitigate hallucinations and ground the LLM's responses in established course curricula, Retrieval-Augmented Generation (RAG) has become a standard approach. Standard RAG relies primarily on dense vector embeddings for semantic search. While effective for semantic matching, vector search can struggle with exact keyword matching, domain-specific terminology, and acronyms, which are prevalent in university courses. To overcome these limitations, we propose an intelligent educational platform that implements a Hybrid RAG architecture, combining semantic vector search with BM25 lexical retrieval.")
add_paragraph("This paper presents the architecture and evaluation of this platform. The system not only provides accurate, curriculum-grounded answers but also features a comprehensive suite of personalized academic support tools, including dynamic study planners, assignment evaluation, and concept graph extraction. We rigorously evaluate the platform's retrieval efficacy and response correctness, demonstrating the superiority of the Hybrid RAG approach in a real-world educational context.")

add_heading("II. BACKGROUND AND RELATED WORK", 1)
add_heading("A. LLMs in Education", 2)
add_paragraph("Large Language Models have been increasingly adopted in educational settings to facilitate automated feedback, content summarization, and interactive tutoring. While models like GPT-4 have demonstrated high proficiency in understanding complex instructions, deploying them in strict academic environments requires careful prompt engineering and context restriction to prevent the dissemination of out-of-scope information.")

add_heading("B. Educational Chatbots", 2)
add_paragraph("Prior generations of educational chatbots relied on predefined rules and decision trees, leading to rigid interactions and poor handling of nuanced queries. Modern LLM-based conversational agents overcome this rigidity, offering fluid dialogue. However, ensuring that these agents strictly adhere to the syllabus and avoid providing answers to assignments directly remains a critical design challenge.")

add_heading("C. Hybrid Retrieval in RAG", 2)
add_paragraph("Retrieval-Augmented Generation enhances LLMs by appending relevant documents to the context window. Traditional RAG systems use vector databases for dense retrieval. Recent advancements suggest that Hybrid Retrieval—which fuses sparse retrieval (like BM25) for exact keyword matching with dense retrieval for semantic understanding—yields higher precision. Techniques like Reciprocal Rank Fusion (RRF) are employed to harmoniously merge the rankings from these disparate retrieval systems without requiring complex machine learning re-rankers.")

add_heading("D. Personalized Learning", 2)
add_paragraph("Personalized learning tailors the educational experience to the individual student's needs, strengths, and weaknesses. By leveraging student interaction history, quiz performance, and stated preferences, AI platforms can dynamically generate study schedules and recommend targeted topics for review, fostering a more effective self-regulated learning environment.")

add_heading("III. PROPOSED SYSTEM", 1)
add_paragraph("The proposed educational platform is designed as a robust, scalable web application featuring a modern frontend, a secure Node.js backend, and a sophisticated AI pipeline. The platform provides a suite of tools for students, faculty, and administrators.")

add_heading("A. System Architecture", 2)
add_paragraph("The system architecture is comprised of a client-side interface built with modern web frameworks and a backend powered by Express.js. Data persistence is managed via MongoDB, which stores user profiles, chat histories, course metadata, and comprehensive audit logs. For the RAG pipeline, a vector database (Chroma) is utilized to store and query high-dimensional embeddings of the course materials. The LLM integration is facilitated through the Groq API, utilizing the 'openai/gpt-oss-120b' model for complex reasoning, with a built-in fallback to 'llama-3.3-70b-versatile' to handle rate limits or token overflow scenarios.")

add_heading("B. Knowledge Acquisition and Processing", 2)
add_paragraph("Faculty members upload course documents, including lecture slides, syllabi, and reading materials, through the administrative dashboard. The ingestion pipeline extracts raw text from these diverse formats, splits the text into manageable chunks to respect LLM context limits, and generates both dense vector embeddings (via embedding models) and sparse representations for the BM25 index. These chunks are annotated with metadata, including document IDs and page numbers, to facilitate precise citation generation.")

add_heading("C. Hybrid RAG Pipeline", 2)
add_paragraph("The core of the platform's accuracy lies in its Hybrid RAG pipeline. When a student submits a query, the system simultaneously executes two retrieval processes. The vector search identifies chunks with high semantic similarity, while the BM25 algorithm retrieves chunks containing exact lexical matches. This dual approach ensures that both conceptual questions and queries regarding specific terms or acronyms are addressed effectively.")

add_heading("D. Query Processing", 2)
add_paragraph("To maintain strict adherence to the course scope, the system employs a lightweight LLM (such as qwen3.6-27b) as a gatekeeper. This model quickly evaluates the relevance of the student's query against the course description. If a query is deemed off-topic, the system politely declines to answer, ensuring that the AI tutor remains a focused academic resource rather than a general-purpose oracle.")

add_heading("E. Retrieval Mechanism and Reciprocal Rank Fusion", 2)
add_paragraph("The results from the vector and BM25 searches are normalized and combined using the Reciprocal Rank Fusion (RRF) algorithm. The RRF score for a document chunk 'd' is calculated as the sum of 1 / (k + rank(d)) across both retrieval methods, where 'k' is a smoothing constant set to 60. This fusion process generates a unified ranking, prioritizing chunks that perform well in both semantic and lexical evaluations.")

add_heading("F. Context Construction", 2)
add_paragraph("The top-K ranked chunks from the RRF process are aggregated to form the context window. Each chunk is prefixed with its source metadata (e.g., [Source 1: Database_Fundamentals.pdf, p.42]). This structured context empowers the LLM to ground its answers explicitly and provide in-line citations, which builds trust and allows students to verify the information independently.")

add_heading("G. LLM Response Generation", 2)
add_paragraph("The aggregated context, the user's chat history (limited to recent turns to manage token costs), and a rigorous system prompt are dispatched to the LLM. The system prompt explicitly instructs the LLM to base its answers solely on the provided context, to adopt an academic tone, and to natively translate concepts if the user has selected a preferred language other than English. The generated response is streamed back to the client for a responsive user experience.")

add_heading("H. Personalized Learning", 2)
add_paragraph("The platform actively monitors student performance through integrated quizzes and interactions. This data feeds into the Study Planner module, which automatically generates tailored study schedules. The schedules account for the student's exam dates, available daily study hours, and identified weak topics (e.g., 'Normalization' or 'Concurrency Control'). By distributing subjects logically and recommending specific review areas, the system promotes structured self-regulated learning.")

add_heading("I. Academic Support Features", 2)
add_paragraph("Beyond conversational Q&A, the platform offers multiple academic support modes. An 'Explain' mode allows students to request simplifications, detailed breakdowns, real-world examples, or exam-focused summaries. Additionally, the system can extract hierarchical concept graphs from answers, visualizing the relationships between core topics. For faculty, an automated assignment evaluator provides preliminary grading and constructive feedback based on defined rubrics.")

add_heading("J. Administrative and Evaluation Module", 2)
add_paragraph("A comprehensive administrative dashboard provides real-time analytics. It tracks user engagement, peak usage times, and system performance metrics such as API response latency and database size. Crucially, the dashboard monitors the AI's efficacy, computing hallucination rates, retrieval accuracy, and automated fact-checking scores. This visibility ensures that educators can continuously refine course materials and system configurations.")

add_heading("IV. EVALUATION", 1)
add_heading("A. Evaluation Framework", 2)
add_paragraph("To rigorously assess the platform's performance, an integrated evaluation framework was developed. This framework measures both the Information Retrieval (IR) metrics of the RAG pipeline and the generative correctness of the LLM responses. Evaluation combines automated benchmarking against ground-truth datasets and manual correctness validation by subject matter experts.")

add_heading("B. Evaluation Setup", 2)
add_paragraph("The evaluation utilized a set of benchmark questions spanning various difficulty levels and cognitive types (factual, conceptual, evaluative). Each question was mapped to specific ground-truth sources within the course documents. To evaluate the RAG pipeline, the system ran each query through four configurations: Hybrid RRF, Vector-Only, BM25-Only, and LLM-Only (baseline without context retrieval). The generated answers were then assessed by human experts who were blinded to the retrieval configuration used.")

add_heading("C. Evaluation Results", 2)
add_paragraph("The evaluation demonstrated that the integration of the Hybrid RAG pipeline significantly enhances both retrieval accuracy and the factual correctness of the generated responses.")

add_heading("D. Correctness and Response Quality", 2)
add_paragraph("The expert manual review of the generated outputs yielded an overall correctness rate of 88.0%. In the controlled benchmark, the Hybrid RRF configuration achieved the highest correctness rate (88.0%), followed closely by Vector-Only (84.0%). The LLM-Only baseline, relying solely on parametric memory, exhibited a noticeably lower correctness rate of 64.0%. The overall precision was calculated at 88%, highlighting the system's reliability in an academic context.")

add_heading("E. Retrieval Evaluation", 2)
add_paragraph("Information Retrieval performance was quantified using the Precision@5 (P@5) metric. The Hybrid RRF configuration demonstrated superior retrieval capabilities, achieving a mean P@5 of 94.8%. This significantly outperformed the Vector-Only approach (84.2%) and the BM25-Only approach (81.5%). The results confirm that combining dense and sparse retrieval effectively captures both the semantic intent and the specific terminology required in higher education queries.")

add_heading("F. Personalization Evaluation", 2)
add_paragraph("Initial data on the personalized learning features indicate strong student engagement. The automated Study Planner and topic recommendations show high acceptance rates among the active student cohort, demonstrating the utility of dynamically adjusting learning paths based on continuous assessment.")

add_heading("G. Performance and Cost Analysis", 2)
add_paragraph("The system maintained robust performance, with an average response time of approximately 1.2 seconds per query. The cost analysis, based on the Groq API pricing for the openai/gpt-oss-120b model ($0.59 per 1M input tokens and $0.79 per 1M output tokens), revealed highly sustainable operational costs. The lightweight gating model (qwen3.6-27b) further minimized expenses by filtering irrelevant queries before they reached the more computationally expensive primary LLM.")

add_heading("V. LIMITATIONS", 1)
add_paragraph("While the platform demonstrates high accuracy, several limitations remain. First, the evaluation was conducted on a localized dataset tailored to a specific course; performance may vary across highly divergent academic domains. Second, the Reciprocal Rank Fusion approach, while computationally efficient, may not achieve the optimal ranking precision possible with a dedicated cross-encoder re-ranking model. Furthermore, reliance on a proprietary API, despite fallback mechanisms, introduces a dependency on external uptime and latency variables. Finally, the automated hallucination detection mechanisms exhibited limitations in accurately flagging subtle unsupported claims, necessitating ongoing human oversight.")

add_heading("VI. CONCLUSION", 1)
add_paragraph("This study presents the architecture and evaluation of an LLM-driven intelligent educational platform. By implementing a Hybrid RAG pipeline that fuses dense vector embeddings with BM25 lexical search, the system effectively mitigates the hallucination risks inherent in raw LLMs. The platform achieved an 88.0% manual correctness rate and a 94.8% retrieval accuracy, proving its viability as a reliable virtual tutor. The inclusion of personalized study planning and extensive administrative analytics further establishes the platform as a comprehensive tool for supporting self-regulated learning and reducing educator workload.")

add_heading("VII. FUTURE WORK", 1)
add_paragraph("Future research will focus on enhancing the retrieval pipeline by integrating cross-encoder re-ranking models to further improve context precision. Additionally, expanding the evaluation dataset across multiple disciplines and conducting extensive longitudinal user studies will provide deeper insights into the platform's impact on long-term student learning outcomes. Finally, exploring the deployment of smaller, fine-tuned open-weight models hosted locally could further reduce operational costs and mitigate privacy concerns.")

# References
add_heading("REFERENCES", 1)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
run = p.add_run("[1] A. T. Neumann, Y. Yin, S. Sowe, S. Decker, and M. Jarke, \"An LLM-Driven Chatbot in Higher Education for Databases and Information Systems,\" IEEE Transactions on Education, vol. 68, no. 1, pp. 103-116, Feb. 2025.\n")
run.font.name = 'Times New Roman'
run.font.size = Pt(9)
run = p.add_run("[2] P. Lewis et al., \"Retrieval-augmented generation for knowledge-intensive NLP tasks,\" in Proc. 34th Int. Conf. Neural Inf. Process. Syst., Red Hook, NY, USA, 2020.\n")
run.font.name = 'Times New Roman'
run.font.size = Pt(9)
run = p.add_run("[3] M. Liu and F. M'Hiri, \"Beyond traditional teaching: Large language models as simulated teaching assistants in computer science,\" in Proc. 55th ACM Tech. Symp. Comput. Sci. Educ. V. 1, New York, NY, USA, 2024, pp. 743-749.\n")
run.font.name = 'Times New Roman'
run.font.size = Pt(9)
run = p.add_run("[4] G. A. Katuka et al., \"Integrating natural language processing in middle school science classrooms: An experience report,\" in Proc. 55th ACM Tech. Symp. Comput. Sci. Educ. V. 1, New York, NY, USA, 2024, pp. 639-645.")
run.font.name = 'Times New Roman'
run.font.size = Pt(9)

doc.save('c:\\Chatbot\\FINAL_IEEE_CONFERENCE_PAPER_v2.docx')
print("Document generated successfully.")
