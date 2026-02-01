# Cogent Fullstack Take-Home Assignment — **“Build a Production-Grade Chat System”**

> This assignment intentionally mirrors the kind of product + infrastructure tradeoffs we make at Cogent.

You are building a **ChatGPT-like application**, but with additional constraints that test how you reason about **state, streaming, correctness, and real-world backend behavior**.

You are **not expected to finish everything**. We care more about *what you choose to build well*, *what you defer*, and *how you explain your decisions*.

⏱ **Suggested timebox:** ~6 hours

🎯 **Bias:** production-readiness > feature completeness

---

## 🧠 What We’re Evaluating (Explicitly)

We want to see evidence of:

* Fullstack ownership (frontend + backend + data)
* Good intuitions around code quality
* Comfort with async / streaming systems
* Thoughtful API and schema design
* UI state management under partial / loading / failure conditions
* Clear tradeoffs and prioritization
* Ability to design something that *could* run in production

---

## 🧩 Core Product Requirements

### 🗨️ Chat Experience

* Users can send messages and receive **assistant responses streamed token-by-token**
* While streaming:

  * UI should show a “typing” / partial response state
  * User should be able to **cancel** the response
* Messages must:

  * Persist correctly
  * Reload deterministically
  * Preserve ordering even under retries or partial failures

---

### 📁 Session Management

Each session must support:

* Create / rename / delete / resume
* Auto-generated title **after the first user message**
* Last-updated timestamp (used for sorting)
* Soft delete (recommended, not required)

Sessions should:

* Be ordered by **most recently active**
* Correctly update when messages stream in (not just when finished)

---

### 🧠 LLM Integration

Use any hosted LLM provider.

**Required behavior:**

* Maintain **conversation context** per session
* Implement **context truncation** or summarization once history exceeds a limit
* Separate **system / user / assistant** roles cleanly

**Bonus:**

* Introduce a second LLM call for **session title generation**
* Introduce **structured outputs** (e.g. JSON schema) for certain prompts

---

## 🧱 Backend Requirements

### API Design

You may keep REST, or introduce GraphQL / tRPC / other options — justify your choice.

#### Sessions

* `GET /api/sessions`
* `POST /api/sessions`
* `PATCH /api/sessions/:id`
* `DELETE /api/sessions/:id`

#### Messages

* `GET /api/sessions/:id/messages`
* `POST /api/sessions/:id/messages`

  * Should support **streaming responses**
  * Should support **abort / cancel**

#### Optional (Bonus)

* `POST /api/sessions/:id/summarize`
* `POST /api/sessions/:id/title`

---

### Data Modeling

Design a schema that supports:

* Message ordering
* Streaming / partial responses
* Retries / idempotency (recommended)
* Efficient session listing
* Soft deletes or archival

You may use:

* Postgres / SQLite
* Prisma / Drizzle / raw SQL
* Or another persistence layer (justify it)

> **You will be asked to explain your schema choices.**

---

### Failure & Edge Cases (Pick at Least One)

Handle **at least one** of the following *correctly*:

* LLM API failure mid-stream
* User refresh during streaming
* Duplicate message submission
* Very long conversations
* Rate limiting / backpressure

> **Signal:** shows real production instincts.

---

## 🎨 Frontend Requirements

Use **React + TypeScript**.

### Required UI Behaviors

* Sidebar with sessions:

  * Sorted by last activity
  * Shows truncated titles
  * Live-updates while streaming
* Chat view:

  * Streaming assistant messages
  * Markdown rendering
  * Clear loading / error states
* Input:

  * Disabled while streaming (or explain alternative)
  * Keyboard-first UX
  * Prevent duplicate sends

### Bonus

* Token-by-token rendering
* Scroll anchoring that doesn’t “jump”
* Retry / regenerate response
* Diff-aware re-rendering (avoid full reflow)

---

## 📦 Non-Functional Requirements

### Deployment

* Deployed publicly
* Backend + frontend clearly separated (or consciously unified)
* Environment variables properly handled

### Observability (Pick One)

* Basic request logging
* Simple tracing
* Error reporting strategy (even if manual)

### Tests

* At least:

  * 1 backend test (message flow or session creation)
  * 1 frontend test **or** API contract test

---

## 🧠 Required Documentation (Very Important)

Your `README.md` should include:

1. **Architecture Overview**

   * Frontend / backend split
   * Streaming approach
   * Data model summary

2. **Tradeoffs**

   * What you chose *not* to build
   * What you would change with more time
   * Where this might break at scale

3. **Production Considerations**

   * Bottlenecks
   * Cost drivers
   * Security considerations

4. **Time Allocation**

   * Rough breakdown of where you spent time

---

## 🧪 Evaluation Rubric

| Area          | What Excellent Looks Like                      |
| ------------- | ---------------------------------------------- |
| System Design | Clear contracts, clean schema, async awareness |
| Backend       | Streaming, persistence, failure handling       |
| Frontend      | Thoughtful state management, polished UX       |
| Code Quality  | Typed APIs, readable structure                 |
| Judgment      | Smart scoping, explicit tradeoffs              |
| Docs          | Clear thinking, production mindset             |

---

## Submission

### Share your code

Share a link to your private github repo with your code hosted to `@snggeng` and `@thanosbaskous` at least 12 hours before your presentation. We will review it and come to the presentation with questions prepared.

### ✅ Submission Checklist

- [ ] Working app deployed with a public URL
- [ ] GitHub repo with clean commit history
- [ ] Clear README with local/dev setup
- [ ] .env.example included
- [ ] Optional: Postman or `api.http` file for API testing
- [ ] Optional: Short Loom or GIF walkthrough

---

Good luck! We're excited to see your work.

