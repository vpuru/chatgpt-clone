# ChatGPT Clone

## Overview

A lightweight ChatGPT clone with ephemeral, non-persistent conversations. Built with a React frontend and a FastAPI backend that streams responses from the OpenAI API. No auth, no database — just a clean chat interface.

https://github.com/user-attachments/assets/676b8e7a-0cd9-4a88-b450-35f8e3050c64

- **Frontend re-rendering strategy** — Streaming content is held in a separate state slice from the messages array, so incoming chunks only trigger re-renders on the streaming bubble (wrapped in `React.memo`) rather than the entire message list. Non-rendering values like the abort controller and message ID counter use `useRef` to avoid unnecessary re-renders, and model selection is isolated in its own context.

- **Backend server-sent events** — The backend uses a FastAPI `StreamingResponse` backed by an async generator that yields standard SSE-formatted events (`data: {...}\n\n`). It emits typed events — `loading`, `chunk`, `done`, and `error` — so the frontend can update UI state progressively. The frontend consumes the stream via `ReadableStream`, buffering incomplete lines and accumulating chunks until the `done` event finalizes the message. We stream directly from the POST request rather than using the browser's native `EventSource` API (which only supports GET). At scale, a two-step pattern — POST to initiate, then GET via `EventSource` to consume — is generally preferred because it allows you to separate API servers from long-lived SSE connection pools, supports stream resumability, and plays better with proxies and load balancers. For a single-server app like this, POST streaming is simpler and avoids the extra round trip and server-side state.

## Running Locally

Create a `backend/.env` file with your OpenAI API key:

```
OPENAI_API_KEY=your-key-here
```

**Docker:**

```bash
docker compose up --build
```

App runs on `http://localhost`.

**Manual:**

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`.
