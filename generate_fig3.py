import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

# Create figures output directories
os.makedirs("c:/Chatbot/figures/revised", exist_ok=True)
os.makedirs("c:/Chatbot/figures/final_paper", exist_ok=True)

def draw_dashed_box(ax, x, y, w, h, label="", label_color="#4A5568"):
    # Dashed container box
    rect = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="square,pad=0.0",
        edgecolor="#94A3B8",
        facecolor="#F8FAFC",
        linestyle="--",
        linewidth=1.2,
        zorder=1
    )
    ax.add_patch(rect)
    if label:
        ax.text(x + 0.02, y + h - 0.04, label, fontsize=8, fontweight="bold",
                color=label_color, ha="left", va="top", zorder=2, family="sans-serif")

def draw_box(ax, x, y, w, h, text, bg_color="#FFFFFF", border_color="#000000", font_size=8, font_weight="bold", subtext="", subtext_size=7):
    rect = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="square,pad=0.0",
        edgecolor=border_color,
        facecolor=bg_color,
        linewidth=1.4,
        zorder=3
    )
    ax.add_patch(rect)
    
    if subtext:
        ax.text(x + w/2, y + h/2 + 0.018, text, fontsize=font_size, fontweight=font_weight,
                color="#000000", ha="center", va="center", zorder=4, family="sans-serif")
        ax.text(x + w/2, y + h/2 - 0.022, subtext, fontsize=subtext_size, fontweight="normal",
                color="#2D3748", ha="center", va="center", zorder=4, family="sans-serif")
    else:
        ax.text(x + w/2, y + h/2, text, fontsize=font_size, fontweight=font_weight,
                color="#000000", ha="center", va="center", zorder=4, family="sans-serif")

def draw_arrow(ax, start, end, linestyle="-", color="#000000", lw=1.3):
    ax.annotate(
        "", xy=end, xytext=start,
        arrowprops=dict(arrowstyle="->", color=color, lw=lw, linestyle=linestyle, shrinkA=0, shrinkB=0),
        zorder=5
    )

# -----------------------------------------------------------------------------
# FIG 3: UPDATED Hybrid Retrieval-Augmented Generation Architecture
# -----------------------------------------------------------------------------
def generate_fig3():
    fig, ax = plt.subplots(figsize=(6.2, 7.2), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    # User Query Box (Top)
    draw_box(ax, 0.35, 0.92, 0.30, 0.055, "USER QUERY", bg_color="#FFFFFF", font_size=9)
    draw_arrow(ax, (0.5, 0.92), (0.5, 0.865))

    # Query Processing & Gatekeeper
    draw_box(ax, 0.28, 0.81, 0.44, 0.055, "Query Processing & Gatekeeper", 
             subtext="(Intent Classifier: α_vec, α_bm25)", font_size=8.5, subtext_size=7.5)

    # Branch arrows
    draw_arrow(ax, (0.5, 0.81), (0.5, 0.77))
    draw_arrow(ax, (0.5, 0.77), (0.24, 0.77))
    draw_arrow(ax, (0.24, 0.77), (0.24, 0.735))
    draw_arrow(ax, (0.5, 0.77), (0.76, 0.77))
    draw_arrow(ax, (0.76, 0.77), (0.76, 0.735))

    # Semantic Retrieval Branch (Left Container)
    draw_dashed_box(ax, 0.05, 0.46, 0.42, 0.29, label="SEMANTIC RETRIEVAL BRANCH")
    draw_box(ax, 0.09, 0.67, 0.30, 0.05, "Query Embedding (MiniLM)", font_size=8)
    draw_arrow(ax, (0.24, 0.67), (0.24, 0.615))
    draw_box(ax, 0.09, 0.565, 0.30, 0.05, "Dense Vector Search", font_size=8)
    draw_arrow(ax, (0.24, 0.565), (0.24, 0.51))
    draw_box(ax, 0.09, 0.46, 0.30, 0.05, "ChromaDB", bg_color="#E3F2FD", font_size=8.5)

    # Lexical Retrieval Branch (Right Container)
    draw_dashed_box(ax, 0.53, 0.46, 0.42, 0.29, label="LEXICAL RETRIEVAL BRANCH")
    draw_box(ax, 0.59, 0.67, 0.30, 0.05, "Query Tokenization", font_size=8)
    draw_arrow(ax, (0.74, 0.67), (0.74, 0.615))
    draw_box(ax, 0.59, 0.565, 0.30, 0.05, "Exact Keyword Matching", font_size=8)
    draw_arrow(ax, (0.74, 0.565), (0.74, 0.51))
    draw_box(ax, 0.59, 0.46, 0.30, 0.05, "Okapi BM25 Index", bg_color="#E3F2FD", font_size=8.5)

    # Arrows from ChromaDB & BM25 into RRF
    draw_arrow(ax, (0.24, 0.46), (0.24, 0.41))
    draw_arrow(ax, (0.24, 0.41), (0.42, 0.41))
    draw_arrow(ax, (0.42, 0.41), (0.42, 0.385))

    draw_arrow(ax, (0.74, 0.46), (0.74, 0.41))
    draw_arrow(ax, (0.74, 0.41), (0.58, 0.41))
    draw_arrow(ax, (0.58, 0.41), (0.58, 0.385))

    # Adaptive RRF Fusion Box
    draw_box(ax, 0.18, 0.295, 0.64, 0.09, "COURSE-ADAPTIVE RECIPROCAL RANK FUSION (RRF)", 
             bg_color="#FFF3CD", border_color="#B7791F", font_size=7.5,
             subtext=r"$RRF(d) = \sum_{m \in \{vec, bm25\}} \frac{\alpha_m}{60 + rank_m(d)}$", subtext_size=9)

    draw_arrow(ax, (0.5, 0.295), (0.5, 0.25))

    # Cross-Encoder Re-Ranker Pass Box
    draw_box(ax, 0.24, 0.19, 0.52, 0.06, "Cross-Encoder Re-Ranker Pass", 
             subtext="Joint Scoring f(Q, C) & Passage Filtering", bg_color="#EBF8FF", border_color="#2B6CB0", font_size=8, subtext_size=7)

    draw_arrow(ax, (0.5, 0.19), (0.5, 0.145))

    # Context Construction
    draw_box(ax, 0.28, 0.09, 0.44, 0.055, "Context Construction", subtext="(Top-K Chunks + Source Citations)", font_size=8, subtext_size=7)

    draw_arrow(ax, (0.5, 0.09), (0.5, 0.055))

    # LLM Generation
    draw_box(ax, 0.28, 0.005, 0.44, 0.05, "LLM Generation\n(openai/gpt-oss-120b via Groq)", font_size=8)

    plt.tight_layout()
    out_path = "c:/Chatbot/figures/revised/fig3_updated_hybrid_rag.png"
    plt.savefig(out_path, dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print("Generated:", out_path)

generate_fig3()
