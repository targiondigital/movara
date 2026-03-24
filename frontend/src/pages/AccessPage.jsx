import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'

export default function AccessPage() {
  const [searchParams] = useSearchParams()
  const { login, user, apiUrl } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('token') // 'token' | 'magic'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)

  // Se já está logado, redireciona
  useEffect(() => {
    if (user) navigate('/chat', { replace: true })
  }, [user])

  // Auto-valida token da URL (?token=xxx)
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setAutoLoading(true)
      validateToken(urlToken)
    }
  }, [])

  async function validateToken(token) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiUrl}/auth/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = await res.json()
      if (res.ok) {
        login(data.token, data.user)
        navigate('/chat', { replace: true })
      } else {
        setError(data.error || 'Link inválido o expirado.')
        setAutoLoading(false)
      }
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.')
      setAutoLoading(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${apiUrl}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('¡Listo! Si tienes acceso, recibirás un email en los próximos minutos.')
      } else {
        setError(data.error || 'Error al enviar el link.')
      }
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Tela de loading automático (token da URL)
  if (autoLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-movara-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-movara-200 border-t-movara-600 rounded-full animate-spin mx-auto mb-6"
               style={{ borderWidth: '4px' }} />
          <h2 className="text-xl font-semibold text-movara-700 mb-2">Verificando tu acceso...</h2>
          <p className="text-gray-500 text-sm">Un momento, por favor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-movara-50 via-white to-movara-50 flex flex-col items-center justify-center p-4">

      {/* Logo / Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-movara-500 to-movara-700 rounded-2xl shadow-lg mb-4">
          <span className="text-4xl">🦵</span>
        </div>
        <h1 className="text-3xl font-bold text-movara-800 tracking-tight">MOVARA</h1>
        <p className="text-movara-600 text-sm font-medium mt-1 tracking-widest uppercase">
          Coach Personal · Rodillas Sin Dolor
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-fade-in">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-movara-50 border border-movara-200 rounded-xl text-movara-700 text-sm flex items-start gap-2">
            <span className="text-base">✅</span>
            <span>{success}</span>
          </div>
        )}

        {mode === 'token' ? (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Bienvenido a tu Coach</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Ingresa el link que recibiste por email tras tu compra para acceder a tu coach personal.
            </p>

            {/* Input de token manual (caso o link não funcione) */}
            <form onSubmit={(e) => { e.preventDefault(); const t = e.target.token.value.trim(); if (t) validateToken(t); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de acceso
                </label>
                <input
                  name="token"
                  type="text"
                  placeholder="Pega aquí tu código de acceso"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-movara-400 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-movara-600 to-movara-500 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:from-movara-700 hover:to-movara-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verificando...' : 'Acceder →'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-400 text-sm mb-2">¿Perdiste tu link de acceso?</p>
              <button
                onClick={() => { setMode('magic'); setError(''); setSuccess(''); }}
                className="text-movara-600 text-sm font-medium hover:text-movara-700 underline underline-offset-2"
              >
                Recibir nuevo link por email
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => { setMode('token'); setError(''); setSuccess(''); }}
              className="flex items-center gap-1 text-movara-600 text-sm font-medium mb-6 hover:text-movara-700"
            >
              ← Volver
            </button>

            <h2 className="text-xl font-semibold text-gray-800 mb-2">Recuperar acceso</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Ingresa el email que usaste para comprar el programa. Te enviaremos un link de acceso válido por 30 minutos.
            </p>

            <form onSubmit={handleMagicLink}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email de compra
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-movara-400 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-gradient-to-r from-movara-600 to-movara-500 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:from-movara-700 hover:to-movara-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar link de acceso →'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-xs mt-8 text-center">
        © {new Date().getFullYear()} Movara · Rodillas Sin Dolor en 7 Días
      </p>
    </div>
  )
}
