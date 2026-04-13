"""
LLM客户端封装
统一使用OpenAI格式调用
"""

import json
import re
from typing import Optional, Dict, Any, List, Iterator
from openai import OpenAI

from ..config import Config


class LLMClient:
    """LLM客户端"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.api_key = api_key or Config.LLM_API_KEY
        self.base_url = base_url or Config.LLM_BASE_URL
        self.model = model or Config.LLM_MODEL_NAME
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY 未配置")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None
    ) -> str:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            response_format: 响应格式（如JSON模式）
            
        Returns:
            模型响应文本
        """
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if response_format:
            kwargs["response_format"] = response_format
        
        response = self.client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        # 部分模型（如MiniMax M2.5）会在content中包含<think>思考内容，需要移除
        content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
        return content

    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Iterator[str]:
        """
        Stream chat completions token-by-token.

        Yields each text delta as it arrives. <think>...</think> content
        (from reasoning models like MiniMax M2.5) is filtered out, so only
        user-facing text is yielded.
        """
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        in_think = False
        buffer = ""
        for chunk in stream:
            try:
                delta = chunk.choices[0].delta.content or ""
            except (IndexError, AttributeError):
                continue
            if not delta:
                continue

            buffer += delta
            # Scan the buffer for <think>/</think> tags. We yield any text
            # outside think blocks and hold the rest until we have enough
            # to decide. The buffer rarely grows beyond a few tokens.
            while True:
                if in_think:
                    end = buffer.find('</think>')
                    if end == -1:
                        buffer = ""  # still inside think, drop buffer
                        break
                    buffer = buffer[end + len('</think>'):]
                    in_think = False
                else:
                    start = buffer.find('<think>')
                    if start == -1:
                        # Might be a partial "<thi..." at the end — keep last
                        # few chars in case the tag straddles chunks.
                        if len(buffer) > 7 and '<' in buffer[-7:]:
                            cut = buffer.rfind('<')
                            if cut >= 0:
                                yield buffer[:cut]
                                buffer = buffer[cut:]
                            else:
                                yield buffer
                                buffer = ""
                        else:
                            yield buffer
                            buffer = ""
                        break
                    if start > 0:
                        yield buffer[:start]
                    buffer = buffer[start + len('<think>'):]
                    in_think = True

        # Flush any trailing text
        if buffer and not in_think:
            yield buffer

    def chat_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        发送聊天请求并返回JSON
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            
        Returns:
            解析后的JSON对象
        """
        response = self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"}
        )
        # 清理markdown代码块标记
        cleaned_response = response.strip()
        cleaned_response = re.sub(r'^```(?:json)?\s*\n?', '', cleaned_response, flags=re.IGNORECASE)
        cleaned_response = re.sub(r'\n?```\s*$', '', cleaned_response)
        cleaned_response = cleaned_response.strip()

        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError:
            raise ValueError(f"LLM返回的JSON格式无效: {cleaned_response}")

