# ChatGPT Clone

## Live Demo
- https://chatgpt-clone-sooty-gamma.vercel.app?_vercel_share=pqL1xeabWmn0EMAPOAdfTtxAHcRg3968

## What this project does
This is a simple ChatGPT-style web app where you can:
- Start new chats
- Send prompts and receive streamed assistant responses
- See response text appear token-by-token
- Stop an in-progress response
- Reopen previous chat sessions
- Rename and delete chat sessions

## Routes (quick guide)
### App routes
- `/` — **Chat home**
- `/sessions/[id]` — **Session chat**

### API routes
- `GET /api/sessions` — **List sessions**
- `POST /api/sessions` — **Create session**
- `PATCH /api/sessions/:id` — **Rename session**
- `DELETE /api/sessions/:id` — **Delete session**
- `GET /api/sessions/:id/messages` — **Load messages**
- `POST /api/sessions/:id/messages` — **Stream reply**

## Main functionality included
- Sidebar with conversation history
- New conversation creation from the home screen
- Session-based message history
- Streaming assistant output in the chat UI
- Auto-title generation for first-message sessions
- Basic error handling for failed sends and requests

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your own `.env.local` with:
   - `DATABASE_URL` pointing to your own PostgreSQL database
   - LLM provider settings for the model you want to use
     - This repo already includes integrations for **OpenAI** (`OPENAI_API_KEY`, optional `OPENAI_MODEL`) and **Ollama** (`OLLAMA_HOST`, `OLLAMA_MODEL`)
3. Run database migrations:
   ```bash
   npm run drizzle:migrate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`
