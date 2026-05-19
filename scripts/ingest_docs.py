import os
import faiss
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

# Use absolute paths to ensure it works from any CWD
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, "data", "emergency_guides")
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "core", "retrieval", "faiss_index")

def ingest_docs():
    print("🚀 Starting real document ingestion...")
    
    if not os.path.exists(DOCS_DIR):
        os.makedirs(DOCS_DIR, exist_ok=True)
        print(f"Created directory {DOCS_DIR}. Please add text guides here.")
        return

    documents = []
    print(f"Reading documents from: {DOCS_DIR}")
    for filename in os.listdir(DOCS_DIR):
        if filename.endswith(".txt") or filename.endswith(".md"):
            filepath = os.path.join(DOCS_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                documents.append(Document(page_content=f.read(), metadata={"source": filename}))

    if not documents:
        print("⚠️ No documents found. Using fallback protocol.")
        documents.append(Document(
            page_content="Any patient with SpO2 below 92% on room air should immediately receive supplemental oxygen and be triaged as RED/YELLOW.",
            metadata={"source": "respiratory_protocol.txt"}
        ))

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_documents(documents)

    print(f"✅ Split documents into {len(chunks)} chunks.")
    print("🧠 Generating embeddings (this will download ~80MB model on first run)...")
    
    # all-MiniLM-L6-v2 is small, fast, and excellent for CPU-only RAG
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    print("📦 Creating FAISS index...")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    
    print(f"💾 Saving index to: {FAISS_INDEX_PATH}")
    os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)
    vectorstore.save_local(FAISS_INDEX_PATH)
    
    print("✨ Ingestion complete! FAISS index is ready for retrieval.")

if __name__ == "__main__":
    ingest_docs()
