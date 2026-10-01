import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def ingest_pdf(file_path: str):
    """
    Reads a PDF, extracts text, chunks it, and attaches metadata.
    Returns a list of dicts with text and metadata.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_path} not found.")
        
    reader = PdfReader(file_path)
    document_name = os.path.basename(file_path)
    
    # Simple chunking: 500 characters with 50 character overlap
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = []
    chunk_counter = 0
    
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if not text:
            continue
            
        splits = text_splitter.split_text(text)
        
        for split in splits:
            chunk_id = f"{document_name}_p{page_num+1}_c{chunk_counter}"
            
            # Note: We aren't doing deep NLP to extract section headers here, 
            # but we preserve page and source which is crucial for citations.
            metadata = {
                "document": document_name,
                "source": file_path,
                "page": page_num + 1,
                "chunk_id": chunk_id
            }
            
            chunks.append({
                "id": chunk_id,
                "text": split,
                "metadata": metadata
            })
            chunk_counter += 1
            
    return chunks

def build_knowledge_base(source_dir: str, vector_store, embedding_model):
    """
    Scans a directory for PDFs, ingests them, embeds them, and upserts to ChromaDB.
    """
    print(f"Scanning {source_dir} for PDF documents...")
    all_chunks = []
    
    for filename in os.listdir(source_dir):
        if filename.endswith(".pdf"):
            file_path = os.path.join(source_dir, filename)
            print(f"Processing {filename}...")
            chunks = ingest_pdf(file_path)
            all_chunks.extend(chunks)
            
    if not all_chunks:
        print("No documents found to ingest.")
        return
        
    print(f"Extracted {len(all_chunks)} chunks total. Embedding...")
    
    ids = [c["id"] for c in all_chunks]
    texts = [c["text"] for c in all_chunks]
    metadatas = [c["metadata"] for c in all_chunks]
    
    embeddings = embedding_model.embed_batch(texts)
    
    print("Upserting to vector database...")
    vector_store.add_chunks(ids, texts, embeddings, metadatas)
    print("Knowledge base successfully built.")
