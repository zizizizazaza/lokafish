"""
Multi-LLM endpoint pool with round-robin load balancing.

Allows distributing LLM calls across multiple API endpoints (e.g. DeepSeek +
Qwen + OpenAI) so that high-parallelism workloads (2000+ agent generation)
don't hit a single provider's rate limit.

Configuration via environment variables:

    # Pool endpoints (comma-separated list of names)
    LLM_POOL_ENDPOINTS=deepseek,qwen,openai

    # Per-endpoint config
    LLM_POOL_DEEPSEEK_KEY=sk-xxx
    LLM_POOL_DEEPSEEK_URL=https://api.deepseek.com/v1
    LLM_POOL_DEEPSEEK_MODEL=deepseek-chat

    LLM_POOL_QWEN_KEY=sk-yyy
    LLM_POOL_QWEN_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
    LLM_POOL_QWEN_MODEL=qwen-plus

If LLM_POOL_ENDPOINTS is not set, falls back to a single-endpoint pool
using the default LLM_API_KEY / LLM_BASE_URL / LLM_MODEL_NAME.
"""

from __future__ import annotations

import itertools
import os
import threading
from dataclasses import dataclass
from typing import List, Optional

from openai import OpenAI

from ..config import Config
from ..utils.logger import get_logger

logger = get_logger('mirofish.llm_pool')


@dataclass(frozen=True)
class LLMEndpoint:
    """A single LLM API endpoint."""
    name: str
    api_key: str
    base_url: str
    model: str

    def create_client(self) -> OpenAI:
        return OpenAI(api_key=self.api_key, base_url=self.base_url)


class LLMPool:
    """
    Thread-safe round-robin pool of LLM endpoints.

    Usage:
        pool = LLMPool.from_env()
        ep = pool.next()          # get next endpoint
        client = ep.create_client()
        client.chat.completions.create(model=ep.model, ...)
    """

    def __init__(self, endpoints: List[LLMEndpoint]):
        if not endpoints:
            raise ValueError("LLMPool requires at least one endpoint")
        self.endpoints = endpoints
        self._cycle = itertools.cycle(endpoints)
        self._lock = threading.Lock()
        logger.info(
            f"LLMPool initialized with {len(endpoints)} endpoint(s): "
            f"{', '.join(e.name for e in endpoints)}"
        )

    # -- Round-robin --------------------------------------------------

    def next(self) -> LLMEndpoint:
        """Return the next endpoint in round-robin order (thread-safe)."""
        with self._lock:
            return next(self._cycle)

    # -- Convenience ---------------------------------------------------

    @property
    def size(self) -> int:
        return len(self.endpoints)

    @property
    def suggested_parallel(self) -> int:
        """Suggest a parallel worker count based on pool size.

        Each endpoint can usually handle 5-10 concurrent requests before
        rate-limiting. We use 8 per endpoint as a balanced default.
        """
        return max(5, self.size * 8)

    # -- Factory -------------------------------------------------------

    @classmethod
    def from_env(cls) -> 'LLMPool':
        """Build the pool from environment variables.

        Reads LLM_POOL_ENDPOINTS (comma-separated names). For each name X,
        reads LLM_POOL_X_KEY, LLM_POOL_X_URL, LLM_POOL_X_MODEL.

        Falls back to a single endpoint from Config if pool vars are absent.
        """
        raw = os.environ.get('LLM_POOL_ENDPOINTS', '').strip()
        if not raw:
            # Fallback: single default endpoint
            return cls([LLMEndpoint(
                name='default',
                api_key=Config.LLM_API_KEY or '',
                base_url=Config.LLM_BASE_URL or 'https://api.openai.com/v1',
                model=Config.LLM_MODEL_NAME or 'gpt-4o-mini',
            )])

        names = [n.strip() for n in raw.split(',') if n.strip()]
        endpoints: List[LLMEndpoint] = []
        for name in names:
            prefix = f'LLM_POOL_{name.upper()}'
            key = os.environ.get(f'{prefix}_KEY', '')
            url = os.environ.get(f'{prefix}_URL', '')
            model = os.environ.get(f'{prefix}_MODEL', '')
            if not key:
                logger.warning(f"Skipping pool endpoint '{name}': {prefix}_KEY not set")
                continue
            if not url:
                url = Config.LLM_BASE_URL or 'https://api.openai.com/v1'
            if not model:
                model = Config.LLM_MODEL_NAME or 'gpt-4o-mini'
            endpoints.append(LLMEndpoint(name=name, api_key=key, base_url=url, model=model))

        if not endpoints:
            logger.warning("No valid pool endpoints found, falling back to default")
            return cls([LLMEndpoint(
                name='default',
                api_key=Config.LLM_API_KEY or '',
                base_url=Config.LLM_BASE_URL or 'https://api.openai.com/v1',
                model=Config.LLM_MODEL_NAME or 'gpt-4o-mini',
            )])

        return cls(endpoints)


# Module-level singleton — lazily initialized.
_pool: Optional[LLMPool] = None
_pool_lock = threading.Lock()


def get_pool() -> LLMPool:
    """Get the global LLMPool singleton (thread-safe lazy init)."""
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = LLMPool.from_env()
    return _pool
