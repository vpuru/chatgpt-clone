import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSubmit?: (message: string) => void
  onAbort?: () => void
  disabled?: boolean
  isStreaming?: boolean
}

export default function ChatInput({ onSubmit, onAbort, disabled, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [message])

  const handleSubmit = () => {
    if (!message.trim() || disabled) return
    onSubmit?.(message)
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-[700px] rounded-2xl bg-[#2f2f2f] border border-white/10 p-3 flex items-center gap-2">
      <textarea
        ref={textareaRef}
        rows={1}
        value={message}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        className="flex-1 bg-transparent text-white placeholder-white/40 resize-none focus:outline-none text-sm leading-relaxed overflow-y-auto"
        style={{ maxHeight: '200px' }}
      />
      {isStreaming ? (
        <button
          onClick={onAbort}
          className="w-9 h-9 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <rect x="5" y="5" width="14" height="14" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={message.trim() === ''}
          className="w-9 h-9 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-4 h-4"
          >
            <path d="M12 4L4 12h5v8h6v-8h5L12 4z" />
          </svg>
        </button>
      )}
    </div>
  )
}
