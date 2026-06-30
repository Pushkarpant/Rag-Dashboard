# backend/services/document_processor.py
# Every chunk produced here is tagged with owner_id —
# this single field is what makes documents private per-user.

from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.services.vector_store import store_chunks
from typing import Dict
import uuid

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)


def process_pdf(file_path: str, owner_id: int) -> Dict:
    """
    Process a PDF: load pages -> split into chunks -> store in Pinecone,
    tagging every chunk with owner_id so it's only ever retrievable
    by the user who uploaded it.
    """
    filename = Path(file_path).name
    print(f"\n📄 Processing PDF: {filename} (owner={owner_id})")

    loader = PyPDFLoader(file_path)
    pages = loader.load()
    print(f"  Loaded {len(pages)} pages")

    if not pages:
        raise ValueError(f"Could not read any pages from {filename}")

    chunks_docs = splitter.split_documents(pages)
    print(f"  Created {len(chunks_docs)} chunks")

    chunks_to_store = []
    for i, chunk in enumerate(chunks_docs):
        # Chunk IDs are namespaced by owner so two users uploading
        # identically-named files never collide in Pinecone.
        chunk_id = f"u{owner_id}_{filename}_c{i}_{uuid.uuid4().hex[:6]}"
        page_num = chunk.metadata.get("page", 0)
        page_display = page_num + 1 if isinstance(page_num, int) else page_num

        chunks_to_store.append({
            "id": chunk_id,
            "text": chunk.page_content,
            "metadata": {
                "filename": filename,
                "page": page_display,
                "chunk_index": i,
                "owner_id": owner_id,
            }
        })

    stored = store_chunks(chunks_to_store)
    print(f"  ✅ Stored {stored}/{len(chunks_to_store)} chunks")

    return {
        "filename": filename,
        "pages": len(pages),
        "chunks_created": len(chunks_to_store),
        "chunks_stored": stored,
        "status": "success"
    }


def process_text_file(file_path: str, owner_id: int) -> Dict:
    """Same pipeline as process_pdf but for plain .txt files."""
    filename = Path(file_path).name
    print(f"\n📝 Processing TXT: {filename} (owner={owner_id})")

    loader = TextLoader(file_path, encoding="utf-8")
    documents = loader.load()

    chunks_docs = splitter.split_documents(documents)
    print(f"  Created {len(chunks_docs)} chunks")

    chunks_to_store = []
    for i, chunk in enumerate(chunks_docs):
        chunk_id = f"u{owner_id}_{filename}_c{i}_{uuid.uuid4().hex[:6]}"
        chunks_to_store.append({
            "id": chunk_id,
            "text": chunk.page_content,
            "metadata": {
                "filename": filename,
                "page": 1,
                "chunk_index": i,
                "owner_id": owner_id,
            }
        })

    stored = store_chunks(chunks_to_store)
    print(f"  ✅ Stored {stored}/{len(chunks_to_store)} chunks")

    return {
        "filename": filename,
        "chunks_created": len(chunks_to_store),
        "chunks_stored": stored,
        "status": "success"
    }
