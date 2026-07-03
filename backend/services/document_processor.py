from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.services.vector_store import store_chunks
from typing import Dict
import uuid

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)

def process_pdf(file_path: str, owner_id: int) -> Dict:
    filename = Path(file_path).name
    print(f"\n📄 PDF: {filename} (owner={owner_id})")
    pages  = PyPDFLoader(file_path).load()
    if not pages:
        raise ValueError(f"No pages found in {filename}")
    chunks_docs = splitter.split_documents(pages)
    to_store = []
    for i, c in enumerate(chunks_docs):
        page = c.metadata.get("page", 0)
        to_store.append({
            "id":   f"u{owner_id}_{filename}_c{i}_{uuid.uuid4().hex[:6]}",
            "text": c.page_content,
            "metadata": {
                "filename": filename,
                "page":     (page + 1) if isinstance(page, int) else page,
                "chunk_index": i,
                "owner_id": owner_id,
            }
        })
    stored = store_chunks(to_store)
    print(f"  ✅ {stored}/{len(to_store)} chunks stored")
    return {"filename": filename, "pages": len(pages),
            "chunks_created": len(to_store), "chunks_stored": stored,
            "status": "success"}

def process_text_file(file_path: str, owner_id: int) -> Dict:
    filename = Path(file_path).name
    print(f"\n📝 TXT: {filename} (owner={owner_id})")
    docs        = TextLoader(file_path, encoding="utf-8").load()
    chunks_docs = splitter.split_documents(docs)
    to_store = [{
        "id":   f"u{owner_id}_{filename}_c{i}_{uuid.uuid4().hex[:6]}",
        "text": c.page_content,
        "metadata": {"filename": filename, "page": 1,
                     "chunk_index": i, "owner_id": owner_id}
    } for i, c in enumerate(chunks_docs)]
    stored = store_chunks(to_store)
    print(f"  ✅ {stored}/{len(to_store)} chunks stored")
    return {"filename": filename, "chunks_created": len(to_store),
            "chunks_stored": stored, "status": "success"}
