import { useRef, useEffect, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ChatInput from '../components/ChatInput'
import { useChat, type Message } from '../hooks/useChat'

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl bg-[#2f2f2f] px-4 py-2 text-white text-sm">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
      {message.content}
    </div>
  )
}

const AssistantBubble = memo(function AssistantBubble({
  content,
  loading,
  isError,
}: {
  content: string
  loading: boolean
  isError: boolean
}) {
  if (loading && content === '') {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-3 w-48 rounded bg-white/20 animate-pulse" />
        <div className="h-3 w-64 rounded bg-white/20 animate-pulse" />
        <div className="h-3 w-40 rounded bg-white/20 animate-pulse" />
      </div>
    )
  }
  return (
    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isError ? 'text-red-400' : 'text-white'}`}>
      {content}
    </div>
  )
})

export default function Conversation() {
  const { messages, streamingContent, status, sendMessage, abort } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const sentRef = useRef(false)

  useEffect(() => {
    const initial = (location.state as { initialMessage?: string } | null)?.initialMessage
    if (initial && !sentRef.current) {
      sentRef.current = true
      // Clear router state so refresh/back-forward navigation doesn't re-send
      navigate('/conversation', { replace: true, state: {} })
      sendMessage(initial)
    } else if (!initial) {
      navigate('/', { replace: true })
    }
  }, []) // intentional empty deps — fire once on mount

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamingContent, messages])

  const isActive = status === 'loading' || status === 'streaming'

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto pt-16 pb-32 px-4">
        <div className="max-w-[700px] mx-auto flex flex-col gap-6">
          {messages.map(m => <MessageBubble key={m.id} message={m} />)}
          {(isActive || (status === 'error' && streamingContent !== '')) && (
            <AssistantBubble
              content={streamingContent}
              loading={status === 'loading'}
              isError={status === 'error'}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4">
        <ChatInput onSubmit={sendMessage} onAbort={abort} disabled={isActive} isStreaming={isActive} />
      </div>
    </div>
  )
}
