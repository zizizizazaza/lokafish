"""
Chat API — proxies frontend chat panels to the configured LLM.

Frontend POSTs the full conversation history each turn (stateless server),
plus an optional `context` blob that gets folded into the system prompt.
This keeps the server simple and lets each panel decide its own context.
"""

import json

from flask import Response, jsonify, request, stream_with_context

from . import chat_bp
from ..utils.llm_client import LLMClient
from ..utils.logger import get_logger

logger = get_logger('mirofish.chat')


def _build_messages(data):
    """Validate payload + build the full message list (system + history).

    Returns (messages, error_response_tuple_or_None).
    """
    messages = data.get('messages') or []
    context = (data.get('context') or '').strip()
    system_override = (data.get('system') or '').strip()

    if not isinstance(messages, list) or not messages:
        return None, (jsonify({
            "success": False,
            "error": "messages must be a non-empty list"
        }), 400)

    cleaned = []
    for m in messages:
        role = m.get('role')
        content = m.get('content')
        if role in ('user', 'assistant') and isinstance(content, str) and content.strip():
            cleaned.append({"role": role, "content": content})
    if not cleaned:
        return None, (jsonify({
            "success": False,
            "error": "no valid messages after cleaning"
        }), 400)

    system_prompt = system_override or DEFAULT_SYSTEM_PROMPT
    if context:
        system_prompt = (
            f"{system_prompt}\n\n"
            f"--- CONTEXT START ---\n{context}\n--- CONTEXT END ---"
        )

    return [{"role": "system", "content": system_prompt}] + cleaned, None


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
        full_messages, err = _build_messages(data)
        if err is not None:
            return err

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


@chat_bp.route('/stream', methods=['POST'])
def chat_stream():
    """
    Same payload as POST /api/chat, but streams the LLM response as SSE.

    Each event line is `data: <json>` where json is one of:
        {"delta": "text fragment"}   — partial token text
        {"done": true}               — final marker
        {"error": "msg"}             — fatal error mid-stream

    The stream ends with the [DONE] sentinel. Frontend should keep reading
    until done==true OR connection closes.
    """
    try:
        data = request.get_json() or {}
    except Exception as e:
        return jsonify({"success": False, "error": f"bad json: {e}"}), 400

    full_messages, err = _build_messages(data)
    if err is not None:
        return err

    def event_stream():
        try:
            client = LLMClient()
            for delta in client.chat_stream(
                messages=full_messages, temperature=0.5, max_tokens=1024
            ):
                if delta:
                    yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"chat stream failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',  # disable nginx buffering if proxied
        'Connection': 'keep-alive',
    }
    return Response(stream_with_context(event_stream()), headers=headers)
