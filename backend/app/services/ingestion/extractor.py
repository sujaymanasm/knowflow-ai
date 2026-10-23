import os
from typing import List, Tuple
from pypdf import PdfReader

class ExtractedPage:
    def __init__(self, page_number: int, text: str):
        self.page_number = page_number
        self.text = text

class DocumentExtractor:
    @staticmethod
    def extract_text(file_path: str, file_type: str) -> Tuple[List[ExtractedPage], int]:
        """
        Extracts text from PDF, TXT, or MD files, preserving page boundaries.
        Returns: (List[ExtractedPage], total_page_count)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_type = file_type.lower().strip().replace(".", "")

        if file_type == "pdf":
            return DocumentExtractor._extract_pdf(file_path)
        elif file_type in ("txt", "md", "text"):
            return DocumentExtractor._extract_text_file(file_path)
        else:
            # Fallback for plain text-like formats
            return DocumentExtractor._extract_text_file(file_path)

    @staticmethod
    def _extract_pdf(file_path: str) -> Tuple[List[ExtractedPage], int]:
        pages: List[ExtractedPage] = []
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            try:
                extracted = page.extract_text() or ""
            except Exception:
                extracted = ""
            
            clean_text = extracted.strip()
            pages.append(ExtractedPage(page_number=page_num, text=clean_text))

        # Check if entire document is scanned/empty
        total_text_length = sum(len(p.text) for p in pages)
        if total_pages > 0 and total_text_length == 0:
            # Document has pages but no extracted text (likely scanned image without OCR)
            pages[0].text = "[Notice: This PDF appears to be a scanned image or empty. Optical Character Recognition (OCR) is not currently enabled for pure image PDFs.]"

        return pages, total_pages

    @staticmethod
    def _extract_text_file(file_path: str) -> Tuple[List[ExtractedPage], int]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        
        clean_text = content.strip()
        # For plain text files, treat every ~3000 chars as a virtual page if large, or 1 page
        if len(clean_text) <= 3500:
            return [ExtractedPage(page_number=1, text=clean_text)], 1
        
        # Split into logical pages
        page_size = 3000
        pages: List[ExtractedPage] = []
        lines = clean_text.splitlines(keepends=True)
        current_page_text = ""
        page_idx = 1
        
        for line in lines:
            if len(current_page_text) + len(line) > page_size and current_page_text.strip():
                pages.append(ExtractedPage(page_number=page_idx, text=current_page_text.strip()))
                page_idx += 1
                current_page_text = line
            else:
                current_page_text += line
        
        if current_page_text.strip():
            pages.append(ExtractedPage(page_number=page_idx, text=current_page_text.strip()))

        return pages, len(pages)
