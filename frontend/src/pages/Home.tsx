import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/ChatInput'

export default function Home() {
  const navigate = useNavigate()

  const handleSubmit = (message: string) => {
    navigate('/conversation', { state: { initialMessage: message } })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <h1 className="text-3xl font-semibold text-white tracking-tight">
        Where should we begin?
      </h1>
      <ChatInput onSubmit={handleSubmit} />
    </div>
  )
}
