import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import AccessPage from './pages/AccessPage'
import ChatPage from './pages/ChatPage'
iport './index.css'

export default function App() {
  const [token, setToken] = useState(null)
  const [consultationId, setConsultationId] = useState(null)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/access" element={<AccessPage setToken={setToken} setConsultationId={setConsultationId} />} />
        <Route path="/chat" element={<ChatPage token={token} consultationId={consultationId} />} />
        <Route path="/" element={<Navigate to="/access" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
