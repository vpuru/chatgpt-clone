import json
import os

import openai
from openai import AsyncOpenAI
from schemas import ChatRequest


client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _event(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def stream_chat(request: ChatRequest):
    yield _event({"type": "loading"})

    try:
        stream = await client.chat.completions.create(
            model=request.model,
            messages=[m.model_dump() for m in request.messages],
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield _event({"type": "chunk", "content": delta})

        yield _event({"type": "done"})

    except openai.AuthenticationError:
        yield _event({"type": "error", "message": "Invalid OpenAI API key"})
    except openai.RateLimitError:
        yield _event({"type": "error", "message": "OpenAI rate limit exceeded"})
    except openai.BadRequestError as e:
        yield _event({"type": "error", "message": str(e)})
    except openai.OpenAIError as e:
        yield _event({"type": "error", "message": f"OpenAI error: {str(e)}"})
