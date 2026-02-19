import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Conversation from './pages/Conversation'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/conversation" element={<Conversation />} />
      </Route>
    </Routes>
  )
}

export default App
