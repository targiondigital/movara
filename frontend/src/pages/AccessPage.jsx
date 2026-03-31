import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../App'

async function fetchWithTimeout(url, options = {}, timeoutMs = 40000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    if (err.name === 'AbortError') throw new Error('timeout')
    throw err
  }
}

export default function AccessPage() {
  const [searchParams] = useSearchParams()
  const { login, user, apiUrl } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('token')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)
  const [serverWaking, setServerWaking] = useState(false)
  const wakeTimerRef = useRef(null)

  useEffect(() => {
    if (user) navigate('/chat', { replace: true })
  }, [user])

  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setAutoLoading(true)
      validateToken(urlToken)
    }
  }, [])

  function startWakeWarning() {
    wakeTimerRef.current = setTimeout(() => setServerWaking(true), 5000)
  }

  function clearWakeWarning() {
    clearTimeout(wakeTimerRef.current)
    setServerWaking(false)
  }

  async function validateToken(token) {
    setLoading(true)
    setError('')
    startWakeWarning()
    try {
      const res = await fetchWithTimeout(
        `${apiUrl}/auth/access`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) },
        45000
      )
      const data = await res.json()
      if (res.ok) {
        login(data.token, data.user)
        navigate('/chat', { replace: true })
      } else {
        setError(data.error || 'Código inválido o expirado. Verifica que lo copiaste completo.')
        setAutoLoading(false)
      }
    } catch (err) {
      setError(err.message === 'timeout'
        ? 'El servidor tardó demasiado. Por favor intenta de nuevo en unos segundos.'
        : 'Error de conexión. Verifica tu internet e intenta de nuevo.')
      setAutoLoading(false)
    } finally {
      setLoading(false)
      clearWakeWarning()
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    startWakeWarning()
    try {
      const res = await fetchWithTimeout(
        `${apiUrl}/auth/magic-link`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) },
        45000
      )
      const data = await res.json()
      if (res.ok) {
        setSuccess('¡Listo! Si tienes acceso, recibirás un email en los próximos minutos.')
      } else {
        setError(data.error || 'Error al enviar el link.')
      }
    } catch (err) {
      setError(err.message === 'timeout'
        ? 'El servidor tardó demasiado. Por favor intenta de nuevo en unos segundos.'
        : 'Error de conexión. Verifica tu internet e intenta de nuevo.')
    } finally {
      setLoading(false)
      clearWakeWarning()
    }
  }

  if (autoLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-movara-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-movara-200 border-t-movara-600 rounded-full animate-spin mx-auto mb-6" style={{ borderWidth: '4px' }} />
          <h2 className="text-xl font-semibold text-movara-700 mb-2">Verificando tu acceso...</h2>
          {serverWaking ? (
            <p className="text-amber-600 text-sm font-medium animate-pulse">Despertando el servidor... puede tardar hasta 30 segundos la primera vez ☕</p>
          ) : (
            <p className="text-gray-500 text-sm">Un momento, por favor.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-movara-50 via-white to-movara-50 flex flex-col items-center justify-center p-4"
         style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-movara-500 to-movara-700 rounded-2xl shadow-lg mb-4">
          <span className="text-4xl">🦵</span>
        </div>
        <h1 className="text-3xl font-bold text-movara-800 tracking-tight">MOVARA</h1>
        <p className="text-movara-600 text-sm font-medium mt-1 tracking-widest uppercase">Coach Personal · Rodillas Sin Dolor</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <span className="text-base flex-shrink-0">⚠️</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-movara-50 border border-movara-200 rounded-xl text-movara-700 text-sm flex items-start gap-2">
            <span className="text-base flex-shrink-0">✅</span><span>{success}</span>
          </div>
        )}
        {serverWaking && loading && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center gap-2">
            <span className="animate-pulse">☕</span>
            <span>El servidor está despertando... puede tardar hasta 30 segundos la primera vez del día.</span>
          </div>
        )}

        {mode === 'token' ? (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Bienvenido a tu Coach</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">Ingresa el código de acceso que recibiste por email tras tu compra.</p>
            <form onSubmit={(e) => { e.preventDefault(); const t = e.target.token.value.trim(); if (t) validateToken(t); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Código de acceso</label>
                <input name="token" type="text" inputMode="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                  placeholder="Pega aquí tu código de acceso"
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-movara-400 focus:border-transparent transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-movara-600 to-movara-500 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:from-movara-700 hover:to-movara-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base">
                {loading ? 'Verificando...' : 'Acceder →'}
              </button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-400 text-sm mb-2">¿Perdiste tu link de acceso?</p>
              <button onClick={() => { setMode('magic'); setError(''); setSuccess('') }}
                className="text-movara-600 text-sm font-medium hover:text-movara-700 underline underline-offset-2">
                Recibir nuevo link por email
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setMode('token'); setError(''); setSuccess('') }}
              className="flex items-center gap-1 text-movara-600 text-sm font-medium mb-6 hover:text-movara-700">← Volver</button>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Recuperar acceso</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">Ingresa el email que usaste para comprar el programa. Te enviaremos un link válido por 30 minutos.</p>
            <form onSubmit={handleMagicLink}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email de compra</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required
                  inputMode="email" autoComplete="email"
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-movara-400 focus:border-transparent transition-all" />
              </div>
              <button type="submit" disabled={loading || !email.trim()}
                className="w-full bg-gradient-to-r from-movara-600 to-movara-500 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:from-movara-700 hover:to-movara-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base">
                {loading ? 'Enviando...' : 'Enviar link de acceso →'}
              </button>
            </form>
          </>
        )}
      </div>
      <p className="text-gray-400 text-xs mt-8 text-center">© {new Date().getFullYear()} Movara · Rodillas Sin Dolor en 7 Días</p>
    </div>
  )
}
