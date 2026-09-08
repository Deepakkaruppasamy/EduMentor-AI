import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_arrow(ax, xy, xytext):
    ax.annotate('', xy=xy, xytext=xytext,
                arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))

def generate_figures():
    os.makedirs("figures", exist_ok=True)
    
    # Figure 1: Overall Architecture (Mindmap / Flowchart)
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.axis('off')
    
    # Central Hub
    center_circle = patches.Circle((0.5, 0.5), 0.15, fill=True, color='#4682b4', ec='black', lw=2)
    ax.add_patch(center_circle)
    ax.text(0.5, 0.5, 'EduMentor\nAI Platform', ha='center', va='center', color='white', fontweight='bold', fontsize=10)
    
    # Peripheral Modules
    modules = [
        (0.2, 0.8, 'Frontend UI', '#add8e6'),
        (0.8, 0.8, 'Backend API', '#90ee90'),
        (0.8, 0.2, 'LLM Engine', '#ffb6c1'),
        (0.2, 0.2, 'Vector DB', '#e6e6fa'),
        (0.1, 0.5, 'User Mgmt', '#ffffe0'),
        (0.9, 0.5, 'Study Planner', '#ffffe0')
    ]
    
    for x, y, text, color in modules:
        box = patches.FancyBboxPatch((x-0.08, y-0.05), 0.16, 0.1, boxstyle="round,pad=0.02", fill=True, color=color, ec='black', lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontweight='bold', fontsize=9)
        draw_arrow(ax, (0.5, 0.5), (x, y))
        draw_arrow(ax, (x, y), (0.5, 0.5)) # Bi-directional
        
    plt.title("Fig. 1. Overall System Architecture", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig1_architecture.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 2: Data Processing Pipeline (Flowchart)
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.axis('off')
    
    steps = ['Raw Docs\n(PDF/PPT)', 'Text Extraction\n(OCR/Parsing)', 'Chunking\n(Recursive)', 'Embedding Model\n(MiniLM)', 'Vector DB\n(ChromaDB)', 'BM25 Index\n(Sparse)']
    colors = ['#d3d3d3', '#ffe4b5', '#ffebcd', '#c2f0c2', '#cce6ff', '#e6e6fa']
    x_positions = [0.05, 0.25, 0.45, 0.65, 0.85, 0.85]
    y_positions = [0.5, 0.5, 0.5, 0.5, 0.7, 0.3]
    
    for i in range(len(steps)):
        box = patches.FancyBboxPatch((x_positions[i]-0.08, y_positions[i]-0.1), 0.16, 0.2, boxstyle="round,pad=0.02", fill=True, color=colors[i], ec='black', lw=1.5)
        ax.add_patch(box)
        ax.text(x_positions[i], y_positions[i], steps[i], ha='center', va='center', fontweight='bold', fontsize=8)
    
    draw_arrow(ax, (0.25-0.08, 0.5), (0.05+0.08, 0.5))
    draw_arrow(ax, (0.45-0.08, 0.5), (0.25+0.08, 0.5))
    draw_arrow(ax, (0.65-0.08, 0.5), (0.45+0.08, 0.5))
    draw_arrow(ax, (0.85-0.08, 0.7), (0.65+0.08, 0.5))
    draw_arrow(ax, (0.85-0.08, 0.3), (0.65+0.08, 0.5))
    
    # Swap direction for rendering
    plt.title("Fig. 2. Data / Document Processing Pipeline", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig3_data_pipeline.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Figure 3: Hybrid RAG Pipeline (Architecture Layered)
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.axis('off')
    
    # Draw layers
    layer_w, layer_h = 0.2, 0.8
    ax.add_patch(patches.Rectangle((0.1, 0.1), layer_w, layer_h, fill=True, color='#f0f8ff', ec='black', lw=1.5))
    ax.text(0.2, 0.95, 'Input Layer', ha='center', va='center', fontweight='bold')
    ax.add_patch(patches.FancyBboxPatch((0.12, 0.4), 0.16, 0.2, boxstyle="round,pad=0.02", fill=True, color='#ffcccc', ec='black'))
    ax.text(0.2, 0.5, 'User Query', ha='center', va='center', fontweight='bold')
    
    ax.add_patch(patches.Rectangle((0.4, 0.1), layer_w, layer_h, fill=True, color='#f0fff0', ec='black', lw=1.5))
    ax.text(0.5, 0.95, 'Retrieval Layer', ha='center', va='center', fontweight='bold')
    
    ax.add_patch(patches.FancyBboxPatch((0.42, 0.6), 0.16, 0.15, boxstyle="round,pad=0.02", fill=True, color='#c2f0c2', ec='black'))
    ax.text(0.5, 0.675, 'Dense Vector\nSearch', ha='center', va='center', fontweight='bold', fontsize=8)
    
    ax.add_patch(patches.FancyBboxPatch((0.42, 0.25), 0.16, 0.15, boxstyle="round,pad=0.02", fill=True, color='#e6e6fa', ec='black'))
    ax.text(0.5, 0.325, 'Sparse BM25\nSearch', ha='center', va='center', fontweight='bold', fontsize=8)
    
    ax.add_patch(patches.Rectangle((0.7, 0.1), layer_w, layer_h, fill=True, color='#fff0f5', ec='black', lw=1.5))
    ax.text(0.8, 0.95, 'Generation Layer', ha='center', va='center', fontweight='bold')
    
    ax.add_patch(patches.FancyBboxPatch((0.72, 0.6), 0.16, 0.15, boxstyle="round,pad=0.02", fill=True, color='#ffd700', ec='black'))
    ax.text(0.8, 0.675, 'Reciprocal Rank\nFusion (RRF)', ha='center', va='center', fontweight='bold', fontsize=8)
    
    ax.add_patch(patches.FancyBboxPatch((0.72, 0.25), 0.16, 0.15, boxstyle="round,pad=0.02", fill=True, color='#ffa07a', ec='black'))
    ax.text(0.8, 0.325, 'Generator LLM\nResponse', ha='center', va='center', fontweight='bold', fontsize=8)
    
    draw_arrow(ax, (0.42, 0.675), (0.28, 0.5))
    draw_arrow(ax, (0.42, 0.325), (0.28, 0.5))
    draw_arrow(ax, (0.72, 0.675), (0.58, 0.675))
    draw_arrow(ax, (0.72, 0.675), (0.58, 0.325))
    draw_arrow(ax, (0.8, 0.4), (0.8, 0.6))
    
    plt.title("Fig. 3. Parallel Hybrid RAG Architecture", fontweight='bold', fontsize=12)
    plt.tight_layout()
    plt.savefig('figures/fig2_hybrid_rag.png', dpi=300, bbox_inches='tight')
    plt.close()

if __name__ == '__main__':
    generate_figures()
