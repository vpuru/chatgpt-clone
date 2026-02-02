"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SessionListItem = {
  id: string;
  title: string | null;
  createdAt: string;
  lastActivityAt: string;
};

type MessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type MessagesResponse = {
  sessionId: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};

type SessionsResponse = {
  sessions: SessionListItem[];
};

const truncateTitle = (title: string | null) => {
  if (!title || title.trim().length === 0) {
    return "New chat";
  }
  return title.length > 28 ? `${title.slice(0, 28)}…` : title;
};

export default function ChatShell() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params?.id === "string" ? params.id : null;
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSessions = async () => {
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) {
          throw new Error("Failed to load sessions.");
        }
        const data = (await res.json()) as SessionsResponse;
        if (isMounted) {
          setSessions(data.sessions ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load data.");
        }
      }
    };

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`);
        if (!res.ok) {
          if (isMounted) {
            setMessages([]);
          }
          return;
        }
        const data = (await res.json()) as MessagesResponse;
        if (isMounted) {
          const mapped = data.messages
            .filter((message) => message.role !== "system")
            .map((message) => ({
              id: message.id,
              role: message.role === "assistant" ? "assistant" : "user",
              content: message.content,
            }));
          setMessages(mapped);
        }
      } catch {
        if (isMounted) {
          setMessages([]);
        }
      }
    };

    loadMessages();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const orderedSessions = useMemo(() => sessions, [sessions]);

  const sendMessage = async (targetSessionId: string, content: string) => {
    const clientMessageId = crypto.randomUUID();
    const res = await fetch(`/api/sessions/${targetSessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, clientMessageId }),
    });

    if (!res.ok) {
      throw new Error("Failed to send message.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) {
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    setIsSending(true);
    setInput("");

    const optimisticMessage: MessageItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      if (!sessionId) {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: null }),
        });
        if (!res.ok) {
          throw new Error("Failed to start a new session.");
        }
        const data = (await res.json()) as SessionListItem;
        await sendMessage(data.id, trimmed);
        router.push(`/sessions/${data.id}`);
        return;
      }

      await sendMessage(sessionId, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white text-slate-900">
      <aside className="w-64 border-r border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-700">Conversations</div>
        <div className="mt-3 space-y-1">
          {orderedSessions.length === 0 ? (
            <p className="text-xs text-slate-500">No sessions yet.</p>
          ) : (
            orderedSessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className={`block rounded-md px-2 py-1 text-sm ${
                  session.id === sessionId
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {truncateTitle(session.title)}
              </Link>
            ))
          )}
        </div>
      </aside>
      <section className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-lg font-semibold">
            {sessionId ? "Chat" : "Start a new chat"}
          </h1>
          <p className="text-sm text-slate-500">
            {sessionId
              ? "Messages will stream here once the backend is wired up."
              : "Type a message to create a new session."}
          </p>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No messages yet.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-lg rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    message.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 px-6 py-4"
        >
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Send a message..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || input.trim().length === 0}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Send
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-rose-500">{error}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
