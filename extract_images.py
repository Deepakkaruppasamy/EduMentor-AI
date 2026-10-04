import fitz
import os

pdf_path = r"C:\Users\deepa\Downloads\Conference paper Final.pdf"
doc = fitz.open(pdf_path)
print("Page count:", len(doc))

out_dir = r"c:\Chatbot\figures\original_extracted"
os.makedirs(out_dir, exist_ok=True)

img_count = 0
for page_num in range(len(doc)):
    page = doc[page_num]
    image_list = page.get_images(full=True)
    print(f"Page {page_num+1} has {len(image_list)} images")
    for img_idx, img in enumerate(image_list):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        img_name = f"extracted_p{page_num+1}_img{img_idx+1}_{xref}.{image_ext}"
        with open(os.path.join(out_dir, img_name), "wb") as f:
            f.write(image_bytes)
        print(f"  Saved {img_name}: {base_image['width']}x{base_image['height']}")
        img_count += 1

print(f"Total extracted images: {img_count}")
