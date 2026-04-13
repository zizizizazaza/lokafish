"""
Chat API — proxies frontend chat panels to the configured LLM.

Frontend POSTs the full conversation history each turn (stateless server),
plus an optional `context` blob that gets folded into the system prompt.
This keeps the server simple and lets each panel decide its own context.
"""

from flask import jsonify, request

from . import chat_bp
from ..utils.llm_client import LLMClient
from ..utils.logger import get_logger

logger = get_logger('mirofish.chat')


DEFAULT_SYSTEM_PROMPT = (
    "You are Loka AI, an analyst assistant embedded in the Loka research platform. "
    "You answer questions grounded in the context provided to you. "
    "Be concise, factual, and reference specific numbers from the context when relevant. "
    "If the context does not contain the answer, say so plainly instead of guessing."
)


@chat_bp.route('', methods=['POST'])
def chat():
    """
    Request:
        {
            "messages": [
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."},
                {"role": "user", "content": "..."}
            ],
            "context": "optional string folded into the system prompt",
            "system": "optional override for the default system prompt"
        }

    Response:
        {
            "success": true,
            "data": { "message": "assistant reply text" }
        }
    """
    try:
        data = request.get_json() or {}
        messages = data.get('messages') or []
        context = (data.get('context') or '').strip()
        system_override = (data.get('system') or '').strip()

        if not isinstance(messages, list) or not messages:
            return jsonify({
                "success": False,
                "error": "messages must be a non-empty list"
            }), 400

        # Whitelist roles + strip anything weird
        cleaned = []
        for m in messages:
            role = m.get('role')
            content = m.get('content')
            if role in ('user', 'assistant') and isinstance(content, str) and content.strip():
                cleaned.append({"role": role, "content": content})
        if not cleaned:
            return jsonify({
                "success": False,
                "error": "no valid messages after cleaning"
            }), 400

        system_prompt = system_override or DEFAULT_SYSTEM_PROMPT
        if context:
            system_prompt = (
                f"{system_prompt}\n\n"
                f"--- CONTEXT START ---\n{context}\n--- CONTEXT END ---"
            )

        full_messages = [{"role": "system", "content": system_prompt}] + cleaned

        client = LLMClient()
        reply = client.chat(messages=full_messages, temperature=0.5, max_tokens=1024)

        return jsonify({
            "success": True,
            "data": {"message": reply}
        })

    except Exception as e:
        logger.error(f"chat endpoint failed: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
