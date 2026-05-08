import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Moon, Sun, AtSign } from 'lucide-react'
import { authApiService } from '../../api/authApi'
import { useAuthStore } from '../../context/authStore'
import { useTheme } from '../../context/ThemeContext'
import { Input, Button, Modal } from '../../components/ui'
import LogoMark from '../../components/ui/LogoMark'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const { toggle, isDark } = useTheme()

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const [form, setForm] = useState({
    email: '', username: '', password: '', confirmPassword: '', fullName: ''
  })
  const [errors, setErrors] = useState({})
  
  const [emailVerified, setEmailVerified] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validateEmailStep = () => {
    const e = {}
    if (!form.fullName.trim())  e.fullName = 'Full name is required'
    else if (!/^[a-zA-Z\s]+$/.test(form.fullName.trim())) e.fullName = 'Full name can only contain letters and spaces'
    if (!form.username.trim())  e.username = 'Username is required'
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters'
    else if (!/^[a-zA-Z0-9]+$/.test(form.username)) e.username = 'Username can only contain letters and numbers'
    if (!form.email.trim())     e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format'
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateFinalStep = () => {
    const e = {}
    if (!form.password)         e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(form.password)) {
      e.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRequestOtp = async () => {
    if (!validateEmailStep()) return
    setOtpLoading(true)
    try {
      await authApiService.requestRegistrationOtp({ email: form.email.trim() })
      toast.success('Verification code sent to your email')
      setOtpRequested(true)
    } catch (err) {
      if (err.response?.data?.message?.includes('already registered')) {
        setDuplicateMessage('This email is already registered. Please login or try with a different email.')
        setShowDuplicateModal(true)
      } else {
        toast.error(err.response?.data?.message || 'Failed to send OTP')
      }
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Please enter the 6-digit OTP')
    setOtpLoading(true)
    try {
      await authApiService.verifyRegistrationOtp({ email: form.email.trim(), otp })
      toast.success('Email verified successfully!')
      setEmailVerified(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!emailVerified) return toast.error('Please verify your email first')
    if (!validateFinalStep()) return
    const { confirmPassword, ...payload } = form
    const res = await register(payload)
    if (res.success) {
      toast.success('Account created! Welcome to ConnectHub 🎉')
      navigate('/chat')
    } else {
      toast.error(res.message)
    }
  }

  const strength = (() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8)  s++
    if (/[A-Z]/.test(p)) s++
    if (/[a-z]/.test(p)) s++
    if (/\d/.test(p)) s++
    if (/[@$!%*?&]/.test(p)) s++
    return s
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][strength]
  const strengthColor = ['', '#d44a4a', 'var(--blue)', 'var(--sea)', 'var(--navy)', 'var(--navy)'][strength]

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

      <div className="w-full max-w-4xl grid lg:grid-cols-[0.85fr_1.15fr] gap-4 sm:gap-5 animate-slide-up">
        <div className="hero-panel relative overflow-hidden rounded-[24px] sm:rounded-[28px] p-6 md:p-8 hidden lg:flex flex-col justify-between min-h-[460px] order-2 lg:order-1">
          <div>
            <div className="hero-badge mb-6">
              <LogoMark size={15} light />
              Build your workspace
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight max-w-sm"
                style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
              Join a chat experience that looks and feels polished.
            </h1>
            <p className="mt-4 max-w-sm text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Create your account in a minute and start organizing conversations with rooms, direct messages, and live presence.
            </p>
          </div>

          <div className="grid gap-3 mt-8 text-sm">
            <div className="hero-stat flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(138,203,208,0.14)' }}>⚡</div>
              <div>
                <p className="font-semibold">Fast onboarding</p>
                <p style={{ color: 'rgba(255,255,255,0.74)' }}>Create an account and start chatting immediately.</p>
              </div>
            </div>
            <div className="hero-stat flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(138,203,208,0.14)' }}>🔒</div>
              <div>
                <p className="font-semibold">Private by default</p>
                <p style={{ color: 'rgba(255,255,255,0.74)' }}>Keep your conversations organized and controlled.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 md:p-7 flex flex-col justify-center order-1 lg:order-2">
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                 style={{ background: 'var(--brand-light)' }}>
              <LogoMark size={28} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              Create account
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Set up your profile and get into the flow.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Jordan Lee"
              icon={User}
              value={form.fullName}
              onChange={set('fullName')}
              error={errors.fullName}
              autoComplete="name"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Username"
                type="text"
                placeholder="jordan_lee"
                icon={AtSign}
                value={form.username}
                onChange={set('username')}
                error={errors.username}
                autoComplete="username"
              />
              <Input
                label="Email"
                type="email"
                placeholder="name@company.com"
                icon={Mail}
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                autoComplete="email"
                disabled={emailVerified || otpRequested}
              />
            </div>

            {/* OTP Flow UI */}
            {!emailVerified && (
              <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                {!otpRequested ? (
                  <div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                      We need to verify your email before you can create an account.
                    </p>
                    <Button type="button" variant="secondary" onClick={handleRequestOtp} loading={otpLoading} className="w-full text-sm">
                      Send Verification Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      We've sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>
                    </p>
                    <Input
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center tracking-[0.5em] font-mono text-lg"
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setOtpRequested(false)} className="flex-1 text-xs">
                        Change Email
                      </Button>
                      <Button type="button" onClick={handleVerifyOtp} loading={otpLoading} className="flex-1 text-xs">
                        Verify Code
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {emailVerified && (
              <div className="animate-fade-in">
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white text-xs">✓</div>
                  <span className="text-xs font-medium text-green-500">Email verified successfully</span>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Create a secure password"
                      icon={Lock}
                      value={form.password}
                      onChange={set('password')}
                      error={errors.password}
                      autoComplete="new-password"
                    />
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                           style={{ background: i <= strength ? strengthColor : 'var(--border)' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div className={`flex items-center gap-2 ${form.password.length >= 8 ? 'text-green-600' : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${form.password.length >= 8 ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 ${/[A-Z]/.test(form.password) ? 'text-green-600' : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(form.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                      One uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${/[a-z]/.test(form.password) ? 'text-green-600' : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${/[a-z]/.test(form.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                      One lowercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${/\d/.test(form.password) ? 'text-green-600' : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${/\d/.test(form.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                      One number
                    </div>
                    <div className={`flex items-center gap-2 ${/[@$!%*?&]/.test(form.password) ? 'text-green-600' : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${/[@$!%*?&]/.test(form.password) ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                      One special character (@$!%*?&)
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              icon={Lock}
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <Button type="submit" loading={isLoading} className="mt-4 w-full">
              Create Account
            </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center mt-5 sm:mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login"
                  style={{ color: 'var(--brand)', fontWeight: 600 }}
                  className="hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <Modal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Email Already Registered"
        maxWidth="400px"
      >
        <div className="space-y-4">
          <p style={{ color: 'var(--text-primary)' }}>{duplicateMessage}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowDuplicateModal(false)
                navigate('/login')
              }}
              className="flex-1"
            >
              Go to Login
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDuplicateModal(false)}
              className="flex-1"
            >
              Try Different Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
