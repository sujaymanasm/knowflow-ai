import re
from typing import List, Dict, Any
from app.services.ingestion.extractor import ExtractedPage

class ChunkItem:
    def __init__(
        self,
        chunk_index: int,
        content: str,
        page_number: int,
        char_offset_start: int,
        char_offset_end: int,
        token_count: int,
    ):
        self.chunk_index = chunk_index
        self.content = content
        self.page_number = page_number
        self.char_offset_start = char_offset_start
        self.char_offset_end = char_offset_end
        self.token_count = token_count

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_index": self.chunk_index,
            "content": self.content,
            "page_number": self.page_number,
            "char_offset_start": self.char_offset_start,
            "char_offset_end": self.char_offset_end,
            "token_count": self.token_count,
        }

class TextChunker:
    @staticmethod
    def chunk_pages(
        pages: List[ExtractedPage],
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ) -> List[ChunkItem]:
        """
        Chunks extracted pages into overlapping passages while tracking page numbers
        and character offsets. Respects paragraph and sentence boundaries.
        """
        if chunk_overlap >= chunk_size:
            chunk_overlap = chunk_size // 4

        chunks: List[ChunkItem] = []
        global_chunk_idx = 0

        for page in pages:
            text = page.text.strip()
            if not text:
                continue

            # Split text into sentences/paragraphs
            paragraphs = re.split(r'(\n\s*\n)', text)
            
            current_buffer = ""
            current_start_offset = 0
            page_offset = 0

            for segment in paragraphs:
                if not segment.strip():
                    page_offset += len(segment)
                    continue

                # If single paragraph is larger than chunk_size, split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', segment)
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue

                    if len(current_buffer) + len(sentence) + 1 <= chunk_size:
                        if current_buffer:
                            current_buffer += " " + sentence
                        else:
                            current_buffer = sentence
                            current_start_offset = page_offset
                    else:
                        if current_buffer:
                            # Save current chunk
                            end_offset = current_start_offset + len(current_buffer)
                            # Approximate token count (~4 chars per token)
                            token_count = max(1, len(current_buffer) // 4)
                            chunks.append(
                                ChunkItem(
                                    chunk_index=global_chunk_idx,
                                    content=current_buffer,
                                    page_number=page.page_number,
                                    char_offset_start=current_start_offset,
                                    char_offset_end=end_offset,
                                    token_count=token_count
                                )
                            )
                            global_chunk_idx += 1

                            # Retain overlap from end of buffer snapping to word boundary
                            if len(current_buffer) > chunk_overlap:
                                raw_overlap = current_buffer[-chunk_overlap:]
                                # Snap to next space so we don't slice a word in half
                                first_space = raw_overlap.find(' ')
                                overlap_text = raw_overlap[first_space + 1:] if first_space != -1 else raw_overlap
                            else:
                                overlap_text = ""

                            current_buffer = (overlap_text + " " + sentence).strip()
                            current_start_offset = max(0, end_offset - len(overlap_text))
                        else:
                            # Extremely long single sentence, split forcibly
                            for i in range(0, len(sentence), chunk_size - chunk_overlap):
                                sub = sentence[i:i + chunk_size]
                                if sub.strip():
                                    chunks.append(
                                        ChunkItem(
                                            chunk_index=global_chunk_idx,
                                            content=sub.strip(),
                                            page_number=page.page_number,
                                            char_offset_start=page_offset + i,
                                            char_offset_end=page_offset + i + len(sub),
                                            token_count=max(1, len(sub) // 4)
                                        )
                                    )
                                    global_chunk_idx += 1
                            current_buffer = ""

                    page_offset += len(sentence) + 1

            if current_buffer.strip():
                end_offset = current_start_offset + len(current_buffer)
                token_count = max(1, len(current_buffer) // 4)
                chunks.append(
                    ChunkItem(
                        chunk_index=global_chunk_idx,
                        content=current_buffer.strip(),
                        page_number=page.page_number,
                        char_offset_start=current_start_offset,
                        char_offset_end=end_offset,
                        token_count=token_count
                    )
                )
                global_chunk_idx += 1

        return chunks
