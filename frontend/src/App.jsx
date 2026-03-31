import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext, useContext, useEffect } from 'react'
import AccessPage from './pages/AccessPage'
import ChatPage from './pages/ChatPage'

// ============================================================
// Auth Context
// ============================================================
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ============================================================
// Protected Route
// ============================================================
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/access" replace />
  return children
}

// ============================================================
// App
// ============================================================
export default function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Acorda o backend do Render (free tier dorme após inatividade)
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {})
  }, [])

  // Restaura sessão do sessionStorage ao recarregar
  useEffect(() => {
    const savedToken = sessionStorage.getItem('movara_token')
    const savedUser = sessionStorage.getItem('movara_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  function login(sessionToken, userData) {
    setToken(sessionToken)
    setUser(userData)
    sessionStorage.setItem('movara_token', sessionToken)
    sessionStorage.setItem('movara_user', JSON.stringify(userData))
  }

  function logout() {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('movara_token')
    sessionStorage.removeItem('movara_user')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-movara-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-movara-200 border-t-movara-600 rounded-full animate-spin"
               style={{ borderWidth: '3px' }} />
          <p className="text-movara-600 text-sm font-medium">Cargando Movara...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiUrl: API_URL }}>
      <BrowserRouter>
        <Routes>
          <Route path="/access" element={<AccessPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to={user ? '/chat' : '/access'} replace />} />
          <Route path="*" element={<Navigate to={user ? '/chat' : '/access'} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
