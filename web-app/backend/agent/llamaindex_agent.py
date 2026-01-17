import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from llama_index.core import StorageContext, VectorStoreIndex, load_index_from_storage
    from llama_index.core.llms import ChatMessage
    from llama_index.core.postprocessor import LLMRerank
    from llama_index.core.query_engine import RetrieverQueryEngine
    from llama_index.core.schema import Document
    from llama_index.core import SimpleDirectoryReader
    from llama_index.readers.file import PDFReader
    from llama_index.llms.ollama import Ollama
    from llama_index.embeddings.ollama import OllamaEmbedding
except ImportError as exc:
    sys.stderr.write(
        "Missing LlamaIndex dependencies. Install with: "
        "pip install -r web-app/backend/agent/requirements.txt\n"
    )
    raise


SYSTEM_CHAT_PROMPT = (
    "You are Omni Board's assistant. Keep answers concise, practical, and focused on firmware "
    "planning, implementation steps, and PRD summaries. If the user asks for steps, provide a short "
    "checklist."
)

SYSTEM_FIRMWARE_PROMPT = (
    "You are an expert embedded systems lead. Analyze raw KiCad files and metadata to produce "
    "a firmware implementation plan and a PRD-ready summary. Use only the provided context. "
    "If information is missing, state assumptions explicitly in notes. Return JSON only, no "
    "extra text. Follow this schema exactly:\n"
    "{\n"
    '  "notes": ["assumption or caveat"],\n'
    '  "firmware_plan": {\n'
    '    "overview": "short paragraph",\n'
    '    "phases": [\n'
    '      {"phase": "Phase name", "tasks": ["task 1", "task 2"]}\n'
    "    ],\n"
    '    "per_component": [\n'
    '      {"reference": "U1", "role": "MCU", "tasks": ["task 1"]}\n'
    "    ]\n"
    "  },\n"
    '  "prd_summary": {\n'
    '    "product_brief": "2-4 sentences",\n'
    '    "functional_requirements": ["req 1", "req 2"],\n'
    '    "nonfunctional_requirements": ["req 1"],\n'
    '    "risks": ["risk 1"],\n'
    '    "milestones": ["milestone 1"]\n'
    "  }\n"
    "}\n"
    "Rules:\n"
    "- Use technical language appropriate for a firmware team.\n"
    "- Extract component references when possible (U1, J2, etc.).\n"
    "- If you cannot infer components, leave per_component empty and add a note.\n"
    "- Keep tasks concrete and implementation-focused."
)


def load_input() -> Dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value


def build_ollama_llm(model: str) -> Ollama:
    base_url = get_env("OLLAMA_BASE_URL", "http://localhost:11434")
    return Ollama(model=model, base_url=base_url, temperature=0.2)


def build_embed_model() -> OllamaEmbedding:
    base_url = get_env("OLLAMA_BASE_URL", "http://localhost:11434")
    embed_model = get_env("OLLAMA_EMBED_MODEL", "qwen3-embedding:0.6b")
    return OllamaEmbedding(model_name=embed_model, base_url=base_url)


def limit_history(history: List[Dict[str, Any]], max_items: int = 8) -> List[Dict[str, Any]]:
    if not history:
        return []
    return history[-max_items:]


def run_chat(llm: Ollama, payload: Dict[str, Any]) -> Dict[str, Any]:
    messages: List[ChatMessage] = [ChatMessage(role="system", content=SYSTEM_CHAT_PROMPT)]
    history = limit_history(payload.get("history", []))
    for item in history:
        role = item.get("role", "user")
        content = str(item.get("content", "")).strip()
        if content:
            messages.append(ChatMessage(role=role, content=content))

    user_message = str(payload.get("message", "")).strip()
    if user_message and (not history or history[-1].get("content") != user_message):
        messages.append(ChatMessage(role="user", content=user_message))

    response = llm.chat(messages)
    content = response.message.content if response and response.message else ""
    return {"message": content.strip()}


def extract_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def resolve_docs_dir() -> Path:
    from_env = get_env("FIRMWARE_DOCS_DIR")
    if from_env:
        return Path(from_env).expanduser().resolve()
    return Path(__file__).resolve().parent.parent / "stm32"


def resolve_index_dir() -> Path:
    from_env = get_env("FIRMWARE_INDEX_DIR")
    if from_env:
        return Path(from_env).expanduser().resolve()
    return Path(__file__).resolve().parent / "index_stm32"


def recursive_chunk(text: str, max_chars: int, overlap: int) -> List[str]:
    separators = ["\n\n", "\n", ". ", " "]

    def split_with_separators(value: str, seps: List[str]) -> List[str]:
        if len(value) <= max_chars or not seps:
            return [value.strip()]

        sep = seps[0]
        parts = value.split(sep)
        if len(parts) == 1:
            return split_with_separators(value, seps[1:])

        chunks: List[str] = []
        current = ""
        for part in parts:
            part = part.strip()
            if not part:
                continue
            candidate = f"{current}{sep if current else ''}{part}"
            if len(candidate) > max_chars:
                if current:
                    chunks.extend(split_with_separators(current, seps[1:]))
                current = part
            else:
                current = candidate
        if current:
            chunks.extend(split_with_separators(current, seps[1:]))
        return chunks

    chunks = split_with_separators(text, separators)
    chunks = [chunk for chunk in chunks if chunk]

    if not chunks:
        return []

    with_overlap: List[str] = [chunks[0]]
    for chunk in chunks[1:]:
        tail = with_overlap[-1]
        overlap_text = tail[-overlap:] if overlap > 0 else ""
        with_overlap.append(f"{overlap_text}{chunk}")
    return with_overlap


def build_stm32_index(embed_model: OllamaEmbedding) -> VectorStoreIndex:
    docs_dir = resolve_docs_dir()
    index_dir = resolve_index_dir()
    index_dir.mkdir(parents=True, exist_ok=True)

    if (index_dir / "docstore.json").exists():
        storage = StorageContext.from_defaults(persist_dir=str(index_dir))
        return load_index_from_storage(storage)

    if not docs_dir.exists():
        return VectorStoreIndex.from_documents([], embed_model=embed_model)

    reader = SimpleDirectoryReader(
        input_dir=str(docs_dir),
        recursive=True,
        file_extractor={".pdf": PDFReader()},
    )
    docs = reader.load_data()

    chunk_size = int(get_env("RAG_CHUNK_SIZE", "1400"))
    overlap = int(get_env("RAG_CHUNK_OVERLAP", "180"))

    chunked_docs: List[Document] = []
    for doc in docs:
        text = doc.text or ""
        for chunk in recursive_chunk(text, chunk_size, overlap):
            chunked_docs.append(
                Document(text=chunk, metadata=doc.metadata or {})
            )

    index = VectorStoreIndex.from_documents(chunked_docs, embed_model=embed_model)
    index.storage_context.persist(persist_dir=str(index_dir))
    return index


def build_rag_context(embed_model: OllamaEmbedding, rerank_llm: Ollama, query: str) -> str:
    index = build_stm32_index(embed_model)
    retriever = index.as_retriever(similarity_top_k=8)
    reranker = LLMRerank(top_n=4, llm=rerank_llm)
    engine = RetrieverQueryEngine(
        retriever=retriever,
        node_postprocessors=[reranker],
        response_mode="compact",
    )
    response = engine.query(query)
    return str(response)


def run_firmware(llm: Ollama, payload: Dict[str, Any]) -> Dict[str, Any]:
    context = payload.get("context", {})
    compact = json.dumps(context, ensure_ascii=True)
    embed_model = build_embed_model()
    rerank_model = get_env("OLLAMA_RERANK_MODEL", "sam860/qwen3-reranker:0.6b-F16")
    rerank_llm = build_ollama_llm(rerank_model)

    rag_query = (
        "STM32 firmware bring-up checklist covering clocks, power rails, boot pins, "
        "debug interfaces, peripheral initialization, and safety checks."
    )
    rag_context = build_rag_context(embed_model, rerank_llm, rag_query)
    messages = [
        ChatMessage(role="system", content=SYSTEM_FIRMWARE_PROMPT),
        ChatMessage(
            role="user",
            content=(
                "STM32 reference context:\n"
                f"{rag_context}\n\n"
                "Context JSON (truncated):\n"
                f"{compact}\n\n"
                "Return JSON only."
            ),
        ),
    ]
    response = llm.chat(messages)
    content = response.message.content if response and response.message else ""
    parsed = extract_json(content)
    if not parsed:
        raise RuntimeError("Agent returned invalid JSON")
    return parsed


def main() -> None:
    payload = load_input()
    mode = str(payload.get("mode", "chat")).lower()
    llm_model = get_env("OLLAMA_LLM_MODEL", "gpt-oss:20b")
    llm = build_ollama_llm(llm_model)

    if mode == "firmware":
        result = run_firmware(llm, payload)
    else:
        result = run_chat(llm, payload)

    sys.stdout.write(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
