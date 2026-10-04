import os
import shutil
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("c:/Chatbot/figures/final_paper", exist_ok=True)
os.makedirs("c:/Chatbot/figures/revised", exist_ok=True)

plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

def draw_dashed_container(ax, x, y, w, h, label="", label_color="#1E293B", bg_color="#F8FAFC"):
    rect = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="square,pad=0.0",
        edgecolor="#94A3B8",
        facecolor=bg_color,
        linestyle="--",
        linewidth=1.2,
        zorder=1
    )
    ax.add_patch(rect)
    if label:
        ax.text(x + 0.02, y + h - 0.025, label, fontsize=7.5, fontweight="bold",
                color=label_color, ha="left", va="top", zorder=2)

def draw_box(ax, x, y, w, h, text, bg_color="#FFFFFF", border_color="#000000",
             font_size=8, font_weight="bold", subtext="", subtext_size=7, text_color="#000000", lw=1.3,
             text_dy=0.016, subtext_dy=-0.018):
    rect = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="square,pad=0.0",
        edgecolor=border_color,
        facecolor=bg_color,
        linewidth=lw,
        zorder=3
    )
    ax.add_patch(rect)
    
    if subtext:
        ax.text(x + w/2, y + h/2 + text_dy, text, fontsize=font_size, fontweight=font_weight,
                color=text_color, ha="center", va="center", zorder=4)
        ax.text(x + w/2, y + h/2 + subtext_dy, subtext, fontsize=subtext_size, fontweight="normal",
                color="#334155", ha="center", va="center", zorder=4)
    else:
        ax.text(x + w/2, y + h/2, text, fontsize=font_size, fontweight=font_weight,
                color=text_color, ha="center", va="center", zorder=4)

def draw_arrow(ax, start, end, linestyle="-", color="#000000", lw=1.3):
    ax.annotate(
        "", xy=end, xytext=start,
        arrowprops=dict(arrowstyle="->", color=color, lw=lw, linestyle=linestyle, shrinkA=0, shrinkB=0),
        zorder=5
    )

def draw_path(ax, points, linestyle="-", color="#000000", lw=1.3):
    for i in range(len(points) - 2):
        ax.plot([points[i][0], points[i+1][0]], [points[i][1], points[i+1][1]],
                color=color, linestyle=linestyle, lw=lw, zorder=5)
    draw_arrow(ax, points[-2], points[-1], linestyle=linestyle, color=color, lw=lw)

# -----------------------------------------------------------------------------
# FIG 4: UPDATED Query Processing and Response Generation Workflow
# -----------------------------------------------------------------------------
def build_fig4():
    fig, ax = plt.subplots(figsize=(7.2, 4.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    # User Query Box
    draw_box(ax, 0.02, 0.63, 0.15, 0.08, "USER\nQUERY", bg_color="#FFFFFF", font_size=8)
    draw_arrow(ax, (0.17, 0.67), (0.22, 0.67))

    # Gatekeeper Relevance Check
    draw_box(ax, 0.22, 0.61, 0.15, 0.12, "Gatekeeper\nRelevance\nCheck", bg_color="#FFFFFF", font_size=8)

    # Reject / Clarify
    draw_arrow(ax, (0.295, 0.61), (0.295, 0.46))
    draw_box(ax, 0.22, 0.38, 0.15, 0.08, "Reject / Clarify", bg_color="#FCE8E6", border_color="#C53030", font_size=7.5)
    draw_arrow(ax, (0.295, 0.38), (0.295, 0.18))

    # Runtime Generation and Validation Container
    draw_dashed_container(ax, 0.41, 0.24, 0.57, 0.72, label="RUNTIME GENERATION AND VALIDATION")

    # Inside Runtime:
    # 1. Hybrid RAG Pipeline
    draw_path(ax, [(0.37, 0.67), (0.41, 0.67), (0.41, 0.785), (0.44, 0.785)])
    draw_box(ax, 0.44, 0.74, 0.14, 0.09, "Hybrid RAG\nPipeline", bg_color="#E3F2FD", border_color="#1E40AF", font_size=7.5)
    draw_arrow(ax, (0.58, 0.785), (0.63, 0.785))

    # 2. Context Construction
    draw_box(ax, 0.63, 0.74, 0.14, 0.09, "Context\nConstruction", bg_color="#FFFFFF", font_size=7.5)
    draw_arrow(ax, (0.70, 0.74), (0.70, 0.67))

    # 3. LLM Generation
    draw_box(ax, 0.63, 0.58, 0.14, 0.09, "LLM\n(gpt-oss-120b)", bg_color="#FFFFFF", font_size=7.5)
    draw_arrow(ax, (0.70, 0.58), (0.70, 0.51))

    # 4. Multi-Signal TrustScore Guardrail
    draw_box(ax, 0.60, 0.38, 0.20, 0.13, "TrustScore Guardrail\n(Claim Decomposition &\nMulti-Signal NLI)", 
             bg_color="#FFF3CD", border_color="#B7791F", font_size=7.2)

    # 5. Pass (Valid) -> goes straight down to UI on right edge
    draw_path(ax, [(0.80, 0.46), (0.83, 0.46), (0.83, 0.56), (0.85, 0.56)])
    draw_box(ax, 0.85, 0.52, 0.11, 0.08, "Pass\n(Valid)", bg_color="#D4EDDA", border_color="#28A745", font_size=7.5)
    draw_path(ax, [(0.905, 0.52), (0.905, 0.18)])

    # 6. Fail (Closed-Loop Self-Correction) -> placed with feedback loop
    draw_path(ax, [(0.80, 0.41), (0.83, 0.41), (0.83, 0.34), (0.85, 0.34)])
    draw_box(ax, 0.85, 0.30, 0.11, 0.08, "Fail: Critic &\nRefine Loop", bg_color="#FCE8E6", border_color="#C53030", font_size=6.8)
    
    # Feedback loop arrow back to Context / LLM
    draw_path(ax, [(0.85, 0.34), (0.70, 0.34), (0.70, 0.38)], linestyle="--", color="#C53030")
    ax.text(0.77, 0.36, "Rewrite Loop", fontsize=6.5, color="#C53030", fontweight="bold", ha="center")

    # Bottom Web Application UI Box
    draw_box(ax, 0.08, 0.10, 0.84, 0.08, "WEB APPLICATION UI", bg_color="#F2F4F7", font_size=8.5)

    plt.tight_layout()
    out_path = "c:/Chatbot/figures/final_paper/fig4_query_processing_workflow.png"
    plt.savefig(out_path, dpi=300, bbox_inches="tight", facecolor="#FFFFFF")
    shutil.copyfile(out_path, "c:/Chatbot/figures/revised/fig4_updated_query_processing.png")
    plt.close()
    print("Saved:", out_path)

# -----------------------------------------------------------------------------
# FIG 9: NEW Multi-Signal NLI Claim Grounding & Closed-Loop Self-Correction
# -----------------------------------------------------------------------------
def build_fig9():
    fig, ax = plt.subplots(figsize=(6.8, 5.2), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    # Inputs (Top)
    draw_box(ax, 0.08, 0.87, 0.38, 0.08, "LLM Generated Response\n(Draft Answer)", bg_color="#FFFFFF", font_size=8)
    draw_box(ax, 0.54, 0.87, 0.38, 0.08, "Retrieved Knowledge Chunks\n(Ground Truth Evidence)", bg_color="#E3F2FD", border_color="#1E40AF", font_size=8)

    # Step 1: Atomic Claim Decomposition
    draw_arrow(ax, (0.27, 0.87), (0.27, 0.79))
    draw_box(ax, 0.08, 0.71, 0.38, 0.08, "Atomic Claim Decomposition\n{c_1, c_2, ..., c_N} (Clause Splitting)", 
             bg_color="#FFFFFF", font_size=7.5)

    # Step 2: Multi-Signal Grounding Evaluation Box
    draw_arrow(ax, (0.27, 0.71), (0.27, 0.63))
    draw_arrow(ax, (0.73, 0.87), (0.73, 0.63))
    draw_dashed_container(ax, 0.06, 0.36, 0.88, 0.27, label="MULTI-SIGNAL NLI CLAIM GROUNDING EVALUATION")

    signals = [
        (0.09, 0.41, 0.18, 0.15, "1. Lexical Recall\n(Substring Match)", "#FFFFFF"),
        (0.30, 0.41, 0.18, 0.15, "2. Char 4-Gram\n(OCR Rob.)", "#FFFFFF"),
        (0.51, 0.41, 0.18, 0.15, "3. Cosine Sim.\n(Embedding)", "#FFFFFF"),
        (0.72, 0.41, 0.18, 0.15, "4. NLI Entailment\n(Composite)", "#EBF8FF")
    ]
    for x, y, w, h, text, bg in signals:
        draw_box(ax, x, y, w, h, text, bg_color=bg, font_size=7)

    # Step 3: Composite TrustScore Computation
    draw_arrow(ax, (0.50, 0.36), (0.50, 0.30))
    
    # Yellow TrustScore Box with clean vertical separation
    draw_box(ax, 0.15, 0.175, 0.70, 0.12, "Composite TrustScore Computation",
             subtext=r"$\mathrm{TrustScore} = \frac{1}{N}\sum_{i=1}^N \max_{j} S(c_i, P_j) \times 100$",
             bg_color="#FFF3CD", border_color="#B7791F", font_size=8, subtext_size=9,
             text_dy=0.024, subtext_dy=-0.022)

    # Decision Branch
    draw_arrow(ax, (0.50, 0.175), (0.50, 0.12))
    
    # Pass branch (Left)
    draw_path(ax, [(0.50, 0.12), (0.22, 0.12), (0.22, 0.08)])
    draw_box(ax, 0.10, 0.012, 0.24, 0.068, "TrustScore ≥ 65%\nDeliver to UI (Verified)", bg_color="#D4EDDA", border_color="#28A745", font_size=7.5)

    # Fail / Critique-and-Refine Loop (Right)
    draw_path(ax, [(0.50, 0.12), (0.78, 0.12), (0.78, 0.08)])
    draw_box(ax, 0.66, 0.012, 0.24, 0.068, "TrustScore < 65%\nCritic & Refine LLM Pass", bg_color="#FCE8E6", border_color="#C53030", font_size=7.5)

    # Self-correction loop arrow back to top LLM Response
    draw_path(ax, [(0.90, 0.046), (0.95, 0.046), (0.95, 0.91), (0.46, 0.91)], linestyle="--", color="#C53030")
    ax.text(0.96, 0.48, "Autonomous Rewrite Loop", fontsize=7, color="#C53030", fontweight="bold", rotation=90, va="center")

    plt.tight_layout()
    out_path = "c:/Chatbot/figures/final_paper/fig9_grounding_self_correction.png"
    plt.savefig(out_path, dpi=300, bbox_inches="tight", facecolor="#FFFFFF")
    plt.close()
    print("Saved:", out_path)

if __name__ == '__main__':
    build_fig4()
    build_fig9()
