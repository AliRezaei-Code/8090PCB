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
    "You are Omni Board's assistant. Keep answers concise, practical, and focused on PCB "
    "design validation and firmware bring-up. If the user asks for steps, provide a short "
    "checklist."
)

SYSTEM_VALIDATION_PROMPT = (
    "You generate short, structured summaries for KiCad validation output. Return JSON only, "
    "no extra text. Use this schema:\n"
    "{\n"
    '  "summary_notes": ["note1", "note2"],\n'
    '  "firmware_overview": "one short paragraph"\n'
    "}\n"
    "Keep summary_notes to 3-6 bullets max, and be factual based on the context."
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


def run_validation(llm: OpenAI, payload: Dict[str, Any]) -> Dict[str, Any]:
    context = payload.get("context", {})
    compact = json.dumps(context, ensure_ascii=True)
    messages = [
        ChatMessage(role="system", content=SYSTEM_VALIDATION_PROMPT),
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

    if mode == "validation":
        result = run_validation(llm, payload)
    else:
        result = run_chat(llm, payload)

    sys.stdout.write(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
