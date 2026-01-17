import json
import os
import sys
from typing import Any, Dict, List, Optional

try:
    from llama_index.core.llms import ChatMessage
    from llama_index.llms.openai import OpenAI
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


def build_llm() -> OpenAI:
    api_key = get_env("CEREBRAS_API_KEY")
    if not api_key:
        raise RuntimeError("CEREBRAS_API_KEY is not set")
    model = get_env("CEREBRAS_MODEL", "gpt-oss-120b")
    api_base = get_env("CEREBRAS_API_BASE", "https://api.cerebras.ai/v1")
    return OpenAI(model=model, api_key=api_key, api_base=api_base, temperature=0.2)


def limit_history(history: List[Dict[str, Any]], max_items: int = 8) -> List[Dict[str, Any]]:
    if not history:
        return []
    return history[-max_items:]


def run_chat(llm: OpenAI, payload: Dict[str, Any]) -> Dict[str, Any]:
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


def run_firmware(llm: OpenAI, payload: Dict[str, Any]) -> Dict[str, Any]:
    context = payload.get("context", {})
    compact = json.dumps(context, ensure_ascii=True)
    messages = [
        ChatMessage(role="system", content=SYSTEM_FIRMWARE_PROMPT),
        ChatMessage(
            role="user",
            content=(
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
    llm = build_llm()

    if mode == "firmware":
        result = run_firmware(llm, payload)
    else:
        result = run_chat(llm, payload)

    sys.stdout.write(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
