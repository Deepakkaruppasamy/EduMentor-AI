import shutil
import os

mapping = {
    "extracted_p3_img1_33.png": "fig1_original_overall_architecture.png",
    "extracted_p3_img2_34.png": "fig2_original_knowledge_acquisition.png",
    "extracted_p3_img3_35.png": "fig3_original_hybrid_rag.png",
    "extracted_p3_img4_36.png": "fig4_original_query_processing.png",
    "extracted_p4_img1_39.png": "fig5_original_personalized_learning.png",
    "extracted_p4_img2_40.png": "fig6_original_academic_support.png",
    "extracted_p4_img3_41.png": "fig7_original_admin_evaluation.png",
    "extracted_p4_img4_42.png": "fig8_original_end_to_end_methodology.png",
}

src_dir = r"c:\Chatbot\figures\original_extracted"
dst_dir = r"c:\Chatbot\figures\original"
os.makedirs(dst_dir, exist_ok=True)

for src_name, dst_name in mapping.items():
    src = os.path.join(src_dir, src_name)
    dst = os.path.join(dst_dir, dst_name)
    shutil.copyfile(src, dst)
    print(f"Copied {src_name} -> {dst_name}")
