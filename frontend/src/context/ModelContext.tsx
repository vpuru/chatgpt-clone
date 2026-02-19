import { createContext, useContext, useState } from 'react'

interface ModelContextValue {
  model: string
  setModel: (m: string) => void
}

const ModelContext = createContext<ModelContextValue | undefined>(undefined)

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState('gpt-5-nano-2025-08-07')
  return (
    <ModelContext.Provider value={{ model, setModel }}>
      {children}
    </ModelContext.Provider>
  )
}

export function useModel() {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModel must be used within ModelProvider')
  return ctx
}
