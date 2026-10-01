from sentence_transformers import SentenceTransformer

class EmbeddingModel:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initializes the sentence transformer embedding model.
        all-MiniLM-L6-v2 is fast, reliable, and runs locally without API keys.
        """
        self.model = SentenceTransformer(model_name)
        
    def embed_text(self, text: str):
        return self.model.encode(text).tolist()
        
    def embed_batch(self, texts: list):
        return self.model.encode(texts).tolist()
