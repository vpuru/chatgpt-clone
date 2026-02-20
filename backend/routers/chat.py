import openai
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from schemas import ChatRequest
from services.openai import stream_chat

router = APIRouter()


@router.post("/api/v1/chat")
async def chat(request: ChatRequest):
    try:
        return StreamingResponse(stream_chat(request), media_type="text/event-stream")
    except openai.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenAI API key")
    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="OpenAI rate limit exceeded")
    except openai.BadRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {str(e)}")
