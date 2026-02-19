import { useState, useRef } from 'react'
import { useModel } from '../context/ModelContext'

export interface Message {
  id: number
  role: 'user' | 'system'
  content: string
}

export type Status = 'idle' | 'loading' | 'streaming' | 'error'

export function useChat() {
  const { model } = useModel()
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const nextId = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  async function sendMessage(text: string) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMsg: Message = { id: nextId.current++, role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setStatus('loading')
    setStreamingContent('')

    const body = {
      model,
      messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
    }

    let accumulated = ''

    try {
      const response = await fetch('http://localhost:8000/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: { type: string; content?: string; error?: string }
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event.type === 'loading') {
            setStatus('loading')
          } else if (event.type === 'chunk') {
            accumulated += event.content ?? ''
            setStreamingContent(accumulated)
            setStatus('streaming')
          } else if (event.type === 'done') {
            const assistantMsg: Message = {
              id: nextId.current++,
              role: 'system',
              content: accumulated,
            }
            setMessages(prev => [...prev, assistantMsg])
            setStreamingContent('')
            setStatus('idle')
          } else if (event.type === 'error') {
            const errMsg: Message = {
              id: nextId.current++,
              role: 'system',
              content: event.error ?? 'An error occurred',
            }
            setMessages(prev => [...prev, errMsg])
            setStreamingContent('')
            setStatus('error')
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (accumulated) {
          setMessages(prev => [...prev, { id: nextId.current++, role: 'system', content: accumulated }])
        }
        setStreamingContent('')
        setStatus('idle')
        return
      }
      const errText = err instanceof Error ? err.message : 'An error occurred'
      setStreamingContent(errText)
      setStatus('error')
    }
  }

  function abort() {
    abortRef.current?.abort()
  }

  return { messages, streamingContent, status, sendMessage, abort }
}
