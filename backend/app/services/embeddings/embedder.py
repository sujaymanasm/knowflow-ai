import json
import math
import hashlib
import re
from typing import List
import httpx
from app.core.config import settings

class EmbeddingService:
    DIMENSION = 384

    @classmethod
    async def get_embeddings(cls, texts: List[str]) -> List[List[float]]:
        """
        Generates 384-dimensional embeddings for a batch of strings.
        Uses OpenAI embeddings if configured, otherwise uses the high-performance local embedder.
        """
        if not texts:
            return []

        if settings.EMBEDDING_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            try:
                return await cls._get_openai_embeddings(texts)
            except Exception as e:
                # Fallback to local on network/API failure
                print(f"[EmbeddingService] OpenAI embedding failed ({e}), falling back to local embedder.")
                return [cls._generate_local_embedding(t) for t in texts]

        return [cls._generate_local_embedding(t) for t in texts]

    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        results = await cls.get_embeddings([text])
        return results[0]

    @classmethod
    async def _get_openai_embeddings(cls, texts: List[str]) -> List[List[float]]:
        url = (settings.OPENAI_BASE_URL.rstrip('/') + "/embeddings") if settings.OPENAI_BASE_URL else "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "input": texts,
            "model": "text-embedding-3-small",
            "dimensions": cls.DIMENSION
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data["data"]]

    @classmethod
    def _generate_local_embedding(cls, text: str) -> List[float]:
        """
        Generates a 384-dimensional dense semantic embedding using subword n-grams,
        token hashing, and L2 normalization.
        """
        vector = [0.0] * cls.DIMENSION
        clean_text = text.lower().strip()
        tokens = re.findall(r'\b\w+\b', clean_text)
        
        if not tokens:
            # Deterministic non-zero unit vector for empty input
            vector[0] = 1.0
            return vector

        # 1. Word token feature hashing
        for token in tokens:
            h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
            dim_idx = h % cls.DIMENSION
            weight = 1.0 + (1.0 / (len(token) + 1))
            vector[dim_idx] += weight

            # 2. Subword 3-gram to 5-gram features
            for n in (3, 4, 5):
                for i in range(max(0, len(token) - n + 1)):
                    sub = token[i:i + n]
                    sub_h = int(hashlib.sha256(sub.encode('utf-8')).hexdigest(), 16)
                    vector[sub_h % cls.DIMENSION] += 0.45

        # 3. Positional bigrams for phrase preservation
        for i in range(len(tokens) - 1):
            bigram = f"{tokens[i]}_{tokens[i+1]}"
            bh = int(hashlib.sha1(bigram.encode('utf-8')).hexdigest(), 16)
            vector[bh % cls.DIMENSION] += 0.8

        # 4. L2 Normalization so dot product equals cosine similarity
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            return [v / norm for v in vector]
        return vector

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """
        Calculates cosine similarity between two float vectors.
        """
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0
        return max(-1.0, min(1.0, dot / (norm_a * norm_b)))

    @staticmethod
    def serialize_vector(vector: List[float]) -> str:
        return json.dumps(vector)

    @staticmethod
    def deserialize_vector(vector_str: str) -> List[float]:
        try:
            return json.loads(vector_str)
        except Exception:
            return []
