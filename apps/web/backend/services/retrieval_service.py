import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Use absolute paths to ensure it works from any CWD
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "..", "..", "core", "retrieval", "faiss_index")

_vectorstore = None

def get_vectorstore():
    """
    Singleton to load the FAISS index once.
    """
    global _vectorstore
    if _vectorstore is None:
        if not os.path.exists(FAISS_INDEX_PATH):
            print(f"⚠️ FAISS index not found at {FAISS_INDEX_PATH}. Please run scripts/ingest_docs.py first.")
            return None
            
        print(f"📦 Loading FAISS index from {FAISS_INDEX_PATH}...")
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        _vectorstore = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
        print("✅ Vectorstore ready.")
        
    return _vectorstore

def retrieve_context(query: str, k: int = 3) -> str:
    """
    Retrieves the most relevant medical protocols for a given query.
    """
    vs = get_vectorstore()
    if vs is None:
        return "N/A (Knowledge base not indexed)"
        
    docs = vs.similarity_search(query, k=k)
    context = "\n\n".join([f"--- Protocol from {doc.metadata.get('source', 'Unknown')} ---\n{doc.page_content}" for doc in docs])
    return context
