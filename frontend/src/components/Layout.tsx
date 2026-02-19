import { Outlet, Link } from 'react-router-dom'
import ModelDropdown from './ModelDropdown'
import { ModelProvider } from '../context/ModelContext'

export default function Layout() {
  return (
    <ModelProvider>
      <div className="min-h-screen bg-[#212121]">
        <div className="fixed top-4 left-4 z-10 flex items-center gap-2">
          <Link to="/" className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </Link>
          <ModelDropdown />
        </div>
        <Outlet />
      </div>
    </ModelProvider>
  )
}
