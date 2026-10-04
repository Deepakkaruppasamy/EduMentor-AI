import os
import shutil
import matplotlib.pyplot as plt
import matplotlib.patches as patches

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
# FIG 4: Clean Layout
# -----------------------------------------------------------------------------
def build_fig4():
    fig, ax = plt.subplots(figsize=(7.4, 4.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    # User Query Box
    draw_box(ax, 0.02, 0.63, 0.14, 0.08, "USER\nQUERY", bg_color="#FFFFFF", font_size=8)
    draw_arrow(ax, (0.16, 0.67), (0.21, 0.67))

    # Gatekeeper Relevance Check
    draw_box(ax, 0.21, 0.61, 0.15, 0.12, "Gatekeeper\nRelevance\nCheck", bg_color="#FFFFFF", font_size=8)

    # Reject / Clarify
    draw_arrow(ax, (0.285, 0.61), (0.285, 0.46))
    draw_box(ax, 0.21, 0.38, 0.15, 0.08, "Reject / Clarify", bg_color="#FCE8E6", border_color="#C53030", font_size=7.5)
    draw_arrow(ax, (0.285, 0.38), (0.285, 0.18))

    # Runtime Generation and Validation Container
    draw_dashed_container(ax, 0.40, 0.24, 0.58, 0.72, label="RUNTIME GENERATION AND VALIDATION")

    # 1. Hybrid RAG Pipeline
    draw_path(ax, [(0.36, 0.67), (0.40, 0.67), (0.40, 0.785), (0.43, 0.785)])
    draw_box(ax, 0.43, 0.74, 0.14, 0.09, "Hybrid RAG\nPipeline", bg_color="#E3F2FD", border_color="#1E40AF", font_size=7.5)
    draw_arrow(ax, (0.57, 0.785), (0.62, 0.785))

    # 2. Context Construction
    draw_box(ax, 0.62, 0.74, 0.14, 0.09, "Context\nConstruction", bg_color="#FFFFFF", font_size=7.5)
    draw_arrow(ax, (0.69, 0.74), (0.69, 0.67))

    # 3. LLM Generation
    draw_box(ax, 0.62, 0.58, 0.14, 0.09, "LLM\n(gpt-oss-120b)", bg_color="#FFFFFF", font_size=7.5)
    draw_arrow(ax, (0.69, 0.58), (0.69, 0.51))

    # 4. Multi-Signal TrustScore Guardrail
    draw_box(ax, 0.58, 0.38, 0.22, 0.13, "TrustScore Guardrail\n(Claim Decomposition &\nMulti-Signal NLI)", 
             bg_color="#FFF3CD", border_color="#B7791F", font_size=7.2)

    # 5. Pass (Valid) -> Right side, clean straight drop to UI
    draw_arrow(ax, (0.80, 0.45), (0.85, 0.45))
    draw_box(ax, 0.85, 0.41, 0.11, 0.08, "Pass\n(Valid)", bg_color="#D4EDDA", border_color="#28A745", font_size=7.5)
    draw_arrow(ax, (0.905, 0.41), (0.905, 0.18))

    # 6. Fail (Closed-Loop Self-Correction) -> Below TrustScore, rewrites back
    draw_arrow(ax, (0.69, 0.38), (0.69, 0.34))
    draw_box(ax, 0.58, 0.26, 0.22, 0.07, "Fail: Critic & Refine Loop", bg_color="#FCE8E6", border_color="#C53030", font_size=7)
    
    # Feedback loop arrow from Fail back to Context / LLM
    draw_path(ax, [(0.58, 0.295), (0.54, 0.295), (0.54, 0.625), (0.62, 0.625)], linestyle="--", color="#C53030")
    ax.text(0.53, 0.48, "Autonomous Rewrite Loop", fontsize=6.5, color="#C53030", fontweight="bold", rotation=90, va="center", ha="right")

    # Bottom Web Application UI Box
    draw_box(ax, 0.06, 0.10, 0.88, 0.08, "WEB APPLICATION UI", bg_color="#F2F4F7", font_size=8.5)

    plt.tight_layout()
    out_path = "c:/Chatbot/figures/final_paper/fig4_query_processing_workflow.png"
    plt.savefig(out_path, dpi=300, bbox_inches="tight", facecolor="#FFFFFF")
    shutil.copyfile(out_path, "c:/Chatbot/figures/revised/fig4_updated_query_processing.png")
    plt.close()
    print("Saved:", out_path)

if __name__ == '__main__':
    build_fig4()
