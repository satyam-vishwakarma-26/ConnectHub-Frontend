import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Moon, Sun, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useTheme } from '../../context/ThemeContext'
import { Input, Button } from '../../components/ui'
import LogoMark from '../../components/ui/LogoMark'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading } = useAuthStore()
  const { toggle, isDark } = useTheme()
  const from = location.state?.from?.pathname || '/chat'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email)    e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const [loginError, setLoginError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!validate()) return
    const res = await login(form)
    if (res.success) {
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } else {
      setLoginError(res.message)
      toast.error(res.message)
    }
  }

  return (
    <div className="auth-bg page-shell min-h-screen flex items-center justify-center p-3 sm:p-4">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 p-2.5 rounded-2xl border transition-colors surface-card z-10"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)',
                 color: 'var(--text-secondary)' }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-4xl grid lg:grid-cols-[1.05fr_0.95fr] gap-4 sm:gap-5 animate-slide-up">
        <div className="hero-panel relative overflow-hidden rounded-[24px] sm:rounded-[28px] p-6 md:p-8 hidden lg:flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="hero-badge mb-6">
              <LogoMark size={15} light />
              ConnectHub
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight max-w-sm"
                style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
              Real-time chat that feels built for serious teams.
            </h1>
            <p className="mt-4 max-w-sm text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Move from scattered messages to focused conversations with rooms, direct messages, reactions, and fast presence updates.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8 text-sm">
            <div className="hero-stat">
              <p className="text-xl font-semibold">Live</p>
              <p style={{ color: 'rgba(255,255,255,0.74)' }}>Typing and presence</p>
            </div>
            <div className="hero-stat">
              <p className="text-xl font-semibold">Private</p>
              <p style={{ color: 'rgba(255,255,255,0.74)' }}>Secure spaces</p>
            </div>
            <div className="hero-stat">
              <p className="text-xl font-semibold">Fast</p>
              <p style={{ color: 'rgba(255,255,255,0.74)' }}>Instant sync</p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 md:p-7 flex flex-col justify-center">
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                 style={{ background: 'var(--brand-light)' }}>
              <LogoMark size={28} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              Welcome back
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to pick up your conversations where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="name@company.com"
              icon={Mail}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={Lock}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              error={errors.password}
              autoComplete="current-password"
            />

            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--brand)' }}
              >
                Forgot Password?
              </Link>
            </div>

            {loginError && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl animate-fade-in"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <AlertTriangle size={16} className="shrink-0" style={{ color: '#ef4444' }} />
                <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{loginError}</p>
              </div>
            )}

            <Button type="submit" loading={isLoading} className="mt-2 w-full">
              Sign In
            </Button>
          </form>

          <div className="divider my-5 sm:my-6">or continue with</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href="https://13.50.25.162.nip.io/api/oauth2/authorization/google"
               className="btn-secondary flex items-center justify-center gap-2 no-underline">
              <GoogleIcon />
              Google
            </a>
            <a href="https://13.50.25.162.nip.io/api/oauth2/authorization/github"
               className="btn-secondary flex items-center justify-center gap-2 no-underline">
              <GithubIcon />
              GitHub
            </a>
          </div>

          <p className="text-center mt-5 sm:mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register"
                  style={{ color: 'var(--brand)', fontWeight: 600 }}
                  className="hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}
