import sys
import os

# Add backend to path so we can import our RAG modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.rag.embeddings import EmbeddingModel
from app.rag.vector_store import VectorStore
from app.rag.ingestion import build_knowledge_base
from app.rag.retriever import Retriever

def calculate_mrr(retrieved_docs, expected_doc):
    for idx, res in enumerate(retrieved_docs):
        if expected_doc in res['document']:
            return 1.0 / (idx + 1)
    return 0.0

def main():
    print("--- Phase 4: Financial RAG ---")
    
    # 1. Initialize RAG components
    print("Initializing embedding model (all-MiniLM-L6-v2)...")
    embedding_model = EmbeddingModel()
    
    print("Initializing ChromaDB persistent vector store...")
    vector_store = VectorStore(persist_dir="../docs/processed/chroma")
    
    # 2. Build the Knowledge Base
    build_knowledge_base("../docs/sources", vector_store, embedding_model)
    
    # 3. Initialize Retriever
    retriever = Retriever(vector_store, embedding_model)
    
    # 4. Evaluation Dataset (Manually Verified)
    eval_dataset = [
        {
            "query": "What is the acceptable Debt-to-Income ratio for loan approval?",
            "expected_doc": "Global_Bank_Retail_Credit_Policy.pdf",
            "expected_keywords": ["dti", "debt-to-income", "40%", "50%"]
        },
        {
            "query": "What is the policy for borrowers with past due accounts or derogatory marks?",
            "expected_doc": "Global_Bank_Retail_Credit_Policy.pdf",
            "expected_keywords": ["delinquency", "past due", "90 days", "derogatory"]
        },
        {
            "query": "At what credit utilization level is a borrower considered high risk?",
            "expected_doc": "Global_Bank_Retail_Credit_Policy.pdf",
            "expected_keywords": ["utilization", "80%", "unsecured", "distress"]
        }
    ]
    
    print("\n--- Running RAG Evaluation ---")
    total_mrr = 0.0
    hits_at_1 = 0
    hits_at_3 = 0
    
    for item in eval_dataset:
        print(f"\nQuery: '{item['query']}'")
        retrieval = retriever.retrieve(item['query'], top_k=3)
        results = retrieval['results']
        
        mrr = calculate_mrr(results, item['expected_doc'])
        total_mrr += mrr
        
        hit = False
        for idx, res in enumerate(results):
            combined_text = res['text'].lower()
            if any(kw.lower() in combined_text for kw in item['expected_keywords']):
                hit = True
                print(f"  [Hit at rank {idx+1}] Source: {res['document']} (Page {res['page']})")
                print(f"  Matched keyword. Excerpt: {res['text'][:120]}...")
                if idx == 0:
                    hits_at_1 += 1
                hits_at_3 += 1
                break
                
        if not hit:
            print("  [Miss] No matching concept found in top 3 retrieved chunks.")
            print(f"  Top retrieved doc: {results[0]['document']} (Page {results[0]['page']}) - {results[0]['text'][:80]}...")

            
    # Calculate metrics
    n = len(eval_dataset)
    print("\n--- Retrieval Metrics ---")
    print(f"Recall@1:  {hits_at_1 / n:.2f}")
    print(f"Recall@3:  {hits_at_3 / n:.2f}")
    print(f"Mean Reciprocal Rank (MRR): {total_mrr / n:.2f}")
    
    # 5. Example of structured evidence output for Phase 5 GenAI
    print("\n--- Example Structured Output for LLM Context ---")
    sample_query = "What information should an analyst consider when evaluating a borrower with high utilization?"
    structured_output = retriever.retrieve(sample_query, top_k=1)
    import json
    print(json.dumps(structured_output, indent=2))
    
    print("\nPhase 4 complete.")

if __name__ == "__main__":
    main()
