import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, KeyRound, ArrowLeft, Moon, Sun, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { Input, Button } from '../../components/ui'
import LogoMark from '../../components/ui/LogoMark'
import { authApiService } from '../../api/authApi'
import toast from 'react-hot-toast'

const STEPS = { EMAIL: 0, OTP: 1, RESET: 2, SUCCESS: 3 }

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { toggle, isDark } = useTheme()

  const [step, setStep] = useState(STEPS.EMAIL)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef([])

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // ── Step 1: Send OTP ────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    setLoading(true)
    try {
      const { data } = await authApiService.forgotPassword({ email })
      toast.success(data.message || 'OTP sent to your email')
      setStep(STEPS.OTP)
      setCountdown(300) // 5 minute countdown
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP'
      toast.error(msg)
      setErrors({ email: msg })
    } finally {
      setLoading(false)
    }
  }

  // ── OTP Input handlers ──────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return // Only digits
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otpValue = otp.join('')
    if (otpValue.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit OTP' })
      return
    }
    setErrors({})

    setLoading(true)
    try {
      const { data } = await authApiService.verifyOtp({ email, otp: otpValue })
      toast.success(data.message || 'OTP verified successfully')
      setStep(STEPS.RESET)
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP'
      toast.error(msg)
      setErrors({ otp: msg })
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Reset Password ──────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!passwords.newPassword) errs.newPassword = 'Password is required'
    else if (passwords.newPassword.length < 6) errs.newPassword = 'Minimum 6 characters'
    if (!passwords.confirmPassword) errs.confirmPassword = 'Please confirm your password'
    else if (passwords.newPassword !== passwords.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    setLoading(true)
    try {
      const { data } = await authApiService.resetPassword({
        email,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword,
      })
      toast.success(data.message || 'Password reset successfully!')
      setStep(STEPS.SUCCESS)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password'
      toast.error(msg)
      setErrors({ newPassword: msg })
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ──────────────────────────────────────────
  const handleResendOtp = async () => {
    if (countdown > 0) return
    setLoading(true)
    try {
      await authApiService.forgotPassword({ email })
      toast.success('New OTP sent to your email')
      setOtp(['', '', '', '', '', ''])
      setCountdown(300)
      setErrors({})
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const formatCountdown = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Step indicators ─────────────────────────────────────
  const stepInfo = [
    { label: 'Email',    icon: Mail },
    { label: 'Verify',   icon: ShieldCheck },
    { label: 'Password', icon: Lock },
  ]

  return (
    <div className="auth-bg page-shell min-h-screen flex items-center justify-center p-3 sm:p-4">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 p-2.5 rounded-2xl border transition-colors surface-card z-10"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md animate-slide-up">
        <div className="surface-card rounded-[22px] sm:rounded-[28px] p-5 sm:p-7 md:p-8">

          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                 style={{ background: 'var(--brand-light)' }}>
              {step === STEPS.SUCCESS ? <CheckCircle2 size={28} style={{ color: 'var(--success, #22c55e)' }} /> : <KeyRound size={28} style={{ color: 'var(--brand)' }} />}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              {step === STEPS.EMAIL && 'Forgot Password'}
              {step === STEPS.OTP && 'Verify OTP'}
              {step === STEPS.RESET && 'New Password'}
              {step === STEPS.SUCCESS && 'All Done!'}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {step === STEPS.EMAIL && "Enter your email and we'll send you a reset code."}
              {step === STEPS.OTP && `Enter the 6-digit code sent to ${email}`}
              {step === STEPS.RESET && 'Choose a strong password for your account.'}
              {step === STEPS.SUCCESS && 'Your password has been reset successfully.'}
            </p>
          </div>

          {/* Step progress bar (hide on success) */}
          {step !== STEPS.SUCCESS && (
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              {stepInfo.map((s, i) => {
                const StepIcon = s.icon
                const isActive = i === step
                const isDone = i < step
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isDone ? 'var(--brand)' : isActive ? 'var(--brand-light)' : 'var(--bg-secondary)',
                        color: isDone ? '#fff' : isActive ? 'var(--brand)' : 'var(--text-muted)',
                        border: `1.5px solid ${isDone || isActive ? 'var(--brand)' : 'var(--border)'}`,
                      }}
                    >
                      {isDone ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {s.label}
                    </span>
                    {/* Progress bar */}
                    {i < stepInfo.length - 1 && null}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Step 1: Email ──────────────────────────────── */}
          {step === STEPS.EMAIL && (
            <form onSubmit={handleSendOtp} className="space-y-4 sm:space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                icon={Mail}
                value={email}
                onChange={e => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                autoFocus
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Send Reset Code
              </Button>
            </form>
          )}

          {/* ── Step 2: OTP ────────────────────────────────── */}
          {step === STEPS.OTP && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="text-sm font-medium block mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                  Verification Code
                </label>
                <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="otp-input"
                      style={{
                        width: '48px', height: '56px',
                        textAlign: 'center', fontSize: '22px', fontWeight: 700,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        background: 'var(--bg-secondary)',
                        border: `2px solid ${digit ? 'var(--brand)' : errors.otp ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: '14px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        caretColor: 'var(--brand)',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.15)' }}
                      onBlur={e => { e.target.style.borderColor = digit ? 'var(--brand)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="text-xs mt-2 text-center" style={{ color: 'var(--danger)' }}>{errors.otp}</p>
                )}
              </div>

              {/* Countdown & Resend */}
              <div className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {countdown > 0 ? (
                  <span>Code expires in <strong style={{ color: 'var(--brand)' }}>{formatCountdown(countdown)}</strong></span>
                ) : (
                  <span>Code expired.</span>
                )}
                <br />
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 240} // Allow resend after 1 min
                  className="mt-1 font-semibold hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Resend Code
                </button>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Verify Code
              </Button>
            </form>
          )}

          {/* ── Step 3: New Password ───────────────────────── */}
          {step === STEPS.RESET && (
            <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 6 characters"
                icon={Lock}
                value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                error={errors.newPassword}
                autoComplete="new-password"
                autoFocus
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                icon={Lock}
                value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Reset Password
              </Button>
            </form>
          )}

          {/* ── Step 4: Success ─────────────────────────────── */}
          {step === STEPS.SUCCESS && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
                   style={{ background: 'rgba(34,197,94,0.12)' }}>
                <CheckCircle2 size={40} style={{ color: '#22c55e' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                You can now sign in with your new password.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          )}

          {/* Back to login link */}
          {step !== STEPS.SUCCESS && (
            <p className="text-center mt-5 sm:mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 hover:underline"
                style={{ color: 'var(--brand)', fontWeight: 600 }}
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
