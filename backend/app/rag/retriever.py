class Retriever:
    def __init__(self, vector_store, embedding_model):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        
    def retrieve(self, query: str, top_k: int = 3):
        """
        Retrieves the top_k most relevant chunks for a given query.
        Returns structured evidence.
        """
        query_embedding = self.embedding_model.embed_text(query)
        
        # Query ChromaDB
        raw_results = self.vector_store.query([query_embedding], n_results=top_k)
        
        structured_results = []
        
        # ChromaDB returns lists of lists since it supports batch querying
        if raw_results['documents'] and len(raw_results['documents']) > 0:
            docs = raw_results['documents'][0]
            metas = raw_results['metadatas'][0]
            distances = raw_results['distances'][0] if 'distances' in raw_results else []
            
            for idx in range(len(docs)):
                res = {
                    "text": docs[idx],
                    "document": metas[idx].get("document"),
                    "page": metas[idx].get("page"),
                    "source": metas[idx].get("source"),
                    "distance": float(distances[idx]) if len(distances) > idx else None
                }
                structured_results.append(res)
                
        return {
            "query": query,
            "results": structured_results
        }
