# ChatGPT Clone

## Demo

https://github.com/user-attachments/assets/demo.mov

## Overview

A lightweight ChatGPT clone with ephemeral, non-persistent conversations. Built with a React frontend and a FastAPI backend that streams responses from the OpenAI API. No auth, no database — just a clean chat interface.

- **Frontend re-rendering strategy** — Streaming content is held in a separate state slice from the messages array, so incoming chunks only trigger re-renders on the streaming bubble (wrapped in `React.memo`) rather than the entire message list. Non-rendering values like the abort controller and message ID counter use `useRef` to avoid unnecessary re-renders, and model selection is isolated in its own context.

- **Backend server-sent events** — The backend uses a FastAPI `StreamingResponse` backed by an async generator that yields standard SSE-formatted events (`data: {...}\n\n`). It emits typed events — `loading`, `chunk`, `done`, and `error` — so the frontend can update UI state progressively. The frontend consumes the stream via `ReadableStream`, buffering incomplete lines and accumulating chunks until the `done` event finalizes the message.
