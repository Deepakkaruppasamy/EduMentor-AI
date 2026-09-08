import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import os

def draw_3d_box(ax, x, y, width, height, depth, color, text, font_size=8, text_rot=90, alpha=1.0):
    # Front face
    front = patches.Rectangle((x, y), width, height, fill=True, facecolor=color, edgecolor='black', zorder=2, alpha=alpha)
    ax.add_patch(front)
    
    # Top face
    top_pts = np.array([[x, y+height], [x+width, y+height], [x+width+depth, y+height+depth], [x+depth, y+height+depth]])
    top = patches.Polygon(top_pts, fill=True, facecolor=color, edgecolor='black', alpha=alpha*0.8, zorder=1)
    ax.add_patch(top)
    
    # Right face
    right_pts = np.array([[x+width, y], [x+width+depth, y+depth], [x+width+depth, y+height+depth], [x+width, y+height]])
    right = patches.Polygon(right_pts, fill=True, facecolor=color, edgecolor='black', alpha=alpha*0.6, zorder=1)
    ax.add_patch(right)
    
    # Text in center of front face
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

    # Figure 2: Hybrid RAG Pipeline (CNN style)
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

if __name__ == '__main__':
    generate_figures()
