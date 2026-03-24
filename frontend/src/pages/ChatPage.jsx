import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import MessageBubble from '../components/MessageBubble'
import LoadingDots from '../components/LoadingDots'

// ============================================================
// Etapas da consultoria (para barra de progresso visual)
// ============================================================
const STAGES = [
  { id: 0, label: 'Bienvenida',    icon: '👋' },
  { id: 1, label: 'Perfil',        icon: '👤' },
  { id: 2, label: 'Rodilla',       icon: '🦵' },
  { id: 3, label: 'Entrenamiento', icon: '🏋️' },
  { id: 4, label: 'Dieta',         icon: '🥗' },
  { id: 5, label: 'Análisis',      icon: '📊' },
  { id: 6, label: 'Tu Plan',       icon: '✅' },
]

export default function ChatPage() {
  const { user, token, logout, apiUrl } = useAuth()
  const navigate = useNavigate()

  const [consultation, setConsultation] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentStage, setCurrentStage] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll automático para última mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isLoading])

  // Carrega ou cria consulta ativa
  useEffect(() => {
    loadConsultation()
  }, [])

  async function loadConsultation() {
    try {
      const res = await fetch(`${apiUrl}/chat/consultation`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401) { logout(); navigate('/access'); return; }
      const data = await res.json()
      if (data.consultation) {
        setConsultation(data.consultation)
        setMessages(data.consultation.messages || [])
        setCurrentStage(data.consultation.current_stage || 0)

        // Se não há mensagens, inicia a consulta automaticamente
        if (!data.consultation.messages?.length) {
          await startConsultation(data.consultation.id)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar consulta:', err)
    } finally {
      setIsInitializing(false)
    }
  }

  // Primeira mensagem automática do coach
  async function startConsultation(consultationId) {
    setIsLoading(true)
    try {
      const res = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: 'Hola, acabo de comprar el programa.',
          consultationId
        })
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Envia mensagem do usuário
  async function sendMessage() {
    const msg = input.trim()
    if (!msg || isLoading || !consultation) return

    setInput('')
    setIsLoading(true)

    // Otimisticamente adiciona a mensagem do usuário
    const optimisticMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const res = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: msg, consultationId: consultation.id })
      })

      if (res.status === 401) { logout(); navigate('/access'); return; }

      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages)
      } else {
        // Remove mensagem otimística em caso de erro
        setMessages(prev => prev.slice(0, -1))
        alert(data.error || 'Error al enviar el mensaje. Por favor intenta de nuevo.')
      }
    } catch {
      setMessages(prev => prev.slice(0, -1))
      alert('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Textarea auto-resize
  function handleInputChange(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  async function startNewSession() {
    if (!confirm('¿Iniciar una nueva consulta de check-in? Tu historial anterior se guardará.')) return
    setIsInitializing(true)
    try {
      const res = await fetch(`${apiUrl}/chat/new-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setConsultation(data.consultation)
        setMessages([])
        setCurrentStage(0)
        setSidebarOpen(false)
        await startConsultation(data.consultation.id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsInitializing(false)
    }
  }

  // ============================================================
  // Loading inicial
  // ============================================================
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-movara-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-movara-200 border-t-movara-600 rounded-full animate-spin mx-auto mb-4"
               style={{ borderWidth: '3px' }} />
          <p className="text-movara-600 font-medium">Preparando tu coach...</p>
        </div>
      </div>
    )
  }

  // ============================================================
  // UI Principal
  // ============================================================
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ---- SIDEBAR (mobile: overlay, desktop: fixo) ---- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`
        fixed md:relative z-30 top-0 left-0 h-full w-72 bg-white border-r border-gray-100
        flex flex-col shadow-xl md:shadow-none transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-movara-500 to-movara-700 flex items-center justify-center shadow-sm">
              <span className="text-xl">🦵</span>
            </div>
            <div>
              <h1 className="font-bold text-movara-800 text-lg leading-none">MOVARA</h1>
              <p className="text-xs text-movara-500 mt-0.5">Coach Personal</p>
            </div>
          </div>
        </div>

        {/* Progresso da consultoria */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Progreso de tu consulta
          </p>
          <div className="space-y-1.5">
            {STAGES.map(stage => (
              <div
                key={stage.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  stage.id < currentStage
                    ? 'bg-movara-50 text-movara-700'
                    : stage.id === currentStage
                    ? 'bg-movara-100 text-movara-800 font-semibold'
                    : 'text-gray-400'
                }`}
              >
                <span className="text-base">{stage.icon}</span>
                <span>{stage.label}</span>
                {stage.id < currentStage && (
                  <span className="ml-auto text-movara-500 text-xs">✓</span>
                )}
                {stage.id === currentStage && (
                  <span className="ml-auto w-1.5 h-1.5 bg-movara-500 rounded-full animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info do usuário */}
        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {user?.name || user?.email}
              </p>
              {user?.name && (
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={startNewSession}
            className="w-full text-sm py-2 px-3 border border-movara-200 text-movara-700 rounded-lg hover:bg-movara-50 transition-colors mb-2"
          >
            + Nueva consulta (check-in)
          </button>
          <button
            onClick={() => { logout(); navigate('/access') }}
            className="w-full text-sm py-2 px-3 text-gray-400 rounded-lg hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---- MAIN CHAT AREA ---- */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            ☰
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-movara-500 to-movara-700 flex items-center justify-center text-sm shadow-sm">
              🦵
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-none">Coach Movara</p>
              <p className="text-xs text-movara-500 mt-0.5">
                {isLoading ? 'Escribiendo...' : 'En línea'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Sesión {consultation?.session_number || 1}
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-5xl mb-4">🦵</div>
              <h3 className="font-semibold text-gray-600 mb-2">Tu coach está listo</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Estamos preparando tu consulta personalizada...
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-movara-500 to-movara-700 flex items-center justify-center text-sm flex-shrink-0">
                🦵
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-movara-400 focus-within:ring-2 focus-within:ring-movara-100 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: '24px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-movara-600 to-movara-500 text-white rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:from-movara-700 hover:to-movara-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="text-xs">...</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-gray-300 mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </main>
    </div>
  )
}
