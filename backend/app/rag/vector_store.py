import chromadb
import os

class VectorStore:
    def __init__(self, persist_dir: str = "../docs/processed/chroma", collection_name: str = "credit_policy"):
        """
        Initializes a persistent ChromaDB vector store.
        """
        # Ensure the directory exists
        os.makedirs(persist_dir, exist_ok=True)
        
        self.client = chromadb.PersistentClient(path=persist_dir)
        # We handle embeddings externally, so we don't pass an embedding function to Chroma here
        self.collection = self.client.get_or_create_collection(name=collection_name)
        
    def add_chunks(self, ids: list, texts: list, embeddings: list, metadatas: list):
        """
        Adds chunks to the vector database.
        """
        self.collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas
        )
        
    def query(self, query_embeddings: list, n_results: int = 3):
        """
        Queries the vector database using pre-computed embeddings.
        """
        results = self.collection.query(
            query_embeddings=query_embeddings,
            n_results=n_results
        )
        return results
