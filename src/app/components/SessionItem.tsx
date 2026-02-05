"use client";

import Link from "next/link";
import { useState } from "react";

type SessionItemProps = {
  session: {
    id: string;
    title: string | null;
  };
  isActive: boolean;
  onRename: (sessionId: string, newTitle: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
  isRenaming: boolean;
  isDeleting: boolean;
};

const truncateTitle = (title: string | null) => {
  if (!title || title.trim().length === 0) {
    return "New chat";
  }
  return title.length > 28 ? `${title.slice(0, 28)}…` : title;
};

export default function SessionItem({
  session,
  isActive,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: SessionItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [renameText, setRenameText] = useState("");

  const handleRenameClick = () => {
    setRenameText(session.title || "");
    setRenameMode(true);
    setMenuOpen(false);
  };

  const handleSaveRename = async () => {
    if (!renameText.trim()) return;
    await onRename(session.id, renameText);
    setRenameMode(false);
    setRenameText("");
  };

  const handleCancelRename = () => {
    setRenameMode(false);
    setRenameText("");
  };

  const handleDeleteClick = async () => {
    setMenuOpen(false);
    await onDelete(session.id);
  };

  if (renameMode) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-slate-200 rounded-md">
        <input
          type="text"
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveRename();
            else if (e.key === "Escape") handleCancelRename();
          }}
          className="flex-1 border border-slate-300 rounded px-2 py-0.5 text-sm focus:border-slate-400 focus:outline-none"
          autoFocus
          disabled={isRenaming}
        />
        <button
          onClick={handleSaveRename}
          disabled={isRenaming}
          className="p-0.5 hover:bg-slate-300 rounded transition-colors disabled:opacity-50"
          aria-label="Save"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-green-600"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
        <button
          onClick={handleCancelRename}
          disabled={isRenaming}
          className="p-0.5 hover:bg-slate-300 rounded transition-colors disabled:opacity-50"
          aria-label="Cancel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-slate-600"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1">
      <Link
        href={`/sessions/${session.id}`}
        className={`flex-1 rounded-md px-2 py-1 text-sm ${
          isActive ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {truncateTitle(session.title)}
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          setMenuOpen(!menuOpen);
        }}
        className="rounded-md p-1 hover:bg-slate-200 transition-colors"
        aria-label="Session menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-slate-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10 py-1 min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRenameClick}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            Rename
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-rose-50 flex items-center gap-2 text-rose-600 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
