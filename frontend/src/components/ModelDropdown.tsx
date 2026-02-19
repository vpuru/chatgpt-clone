import { useModel } from '../context/ModelContext'

const MODELS = [
  { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano' },
]

export default function ModelDropdown() {
  const { model, setModel } = useModel()

  return (
    <div className="relative inline-flex items-center">
      <select
        value={model}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModel(e.target.value)}
        className="appearance-none bg-transparent text-white text-sm font-medium pr-6 pl-1 py-1 rounded-md cursor-pointer hover:bg-white/10 focus:outline-none transition-colors"
      >
        {MODELS.map((m) => (
          <option key={m.value} value={m.value} className="bg-[#2f2f2f] text-white">
            {m.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1 text-white/70 text-xs">∨</span>
    </div>
  )
}
