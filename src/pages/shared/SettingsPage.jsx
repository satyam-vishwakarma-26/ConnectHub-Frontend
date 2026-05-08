import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, KeyRound, Trash2, AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react'
import { authApiService } from '../../api/authApi'
import { useAuthStore } from '../../context/authStore'
import { wsService } from '../../api/wsService'
import toast from 'react-hot-toast'

const STEPS = {
  IDLE: 'idle',
  EMAIL: 'email',
  OTP: 'otp',
  CONFIRM: 'confirm',
  DELETED: 'deleted',
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [step, setStep] = useState(STEPS.IDLE)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const otpRefs = useRef([])

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === STEPS.OTP) setTimeout(() => otpRefs.current[0]?.focus(), 120)
  }, [step])

  const resetFlow = () => {
    setStep(STEPS.IDLE)
    setEmail('')
    setOtp(['', '', '', '', '', ''])
    setError('')
  }

  // ── Step 1: Request OTP ──────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('Please enter your email address.')
    setLoading(true)
    try {
      await authApiService.requestDeletionOtp({ email: email.trim() })
      toast.success('Verification code sent to your email')
      setStep(STEPS.OTP)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ───────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    const code = otp.join('')
    if (code.length !== 6) return setError('Please enter the complete 6-digit code.')
    setLoading(true)
    try {
      await authApiService.verifyDeletionOtp({ email: email.trim(), otp: code })
      toast.success('OTP verified successfully')
      setStep(STEPS.CONFIRM)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Confirm Deletion ─────────────────────
  const handleConfirmDeletion = async () => {
    setError('')
    setLoading(true)
    try {
      await authApiService.confirmAccountDeletion({ email: email.trim() })
      setStep(STEPS.DELETED)
      toast.success('Account deleted successfully')
      // Clean up after a delay
      setTimeout(() => {
        wsService.disconnect()
        localStorage.clear()
        useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
        navigate('/login', { replace: true })
      }, 3500)
    } catch (err) {
      setError(err.response?.data?.message || 'Deletion failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP Input Handlers ───────────────────────────
  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setOtp(next)
    const focusIdx = Math.min(pasted.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  // ── Step indicator ───────────────────────────────
  const stepNum = step === STEPS.EMAIL ? 1 : step === STEPS.OTP ? 2 : step === STEPS.CONFIRM ? 3 : 0
  const stepLabels = ['Enter Email', 'Verify OTP', 'Confirm']

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-4 sm:p-5 md:p-6 max-w-2xl mx-auto pt-14 md:pt-6 pb-20 animate-fade-in">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/chat')} 
          className="md:hidden flex items-center gap-2 text-sm font-medium mb-4 transition-colors hover:opacity-80" 
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back to Chat
        </button>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your account preferences and security</p>
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(220,38,38,0.25)', background: 'var(--bg-secondary)' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.04)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.1)' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Danger Zone</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Irreversible account actions</p>
          </div>
        </div>

        <div className="p-5">
          {/* ── IDLE: Show delete button ── */}
          {step === STEPS.IDLE && (
            <div className="animate-fade-in">
              <div className="flex items-start gap-3 mb-5 p-4 rounded-xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.12)' }}>
                <Trash2 size={20} className="mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Delete your account</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Permanently remove your account and all associated data including messages, rooms, and subscriptions. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(STEPS.EMAIL)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}
              >
                <Trash2 size={16} />
                Delete My Account
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Active Flow: Step Progress ── */}
          {step !== STEPS.IDLE && step !== STEPS.DELETED && (
            <div className="animate-fade-in">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {stepLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                        style={{
                          background: i + 1 <= stepNum ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'var(--bg-tertiary)',
                          color: i + 1 <= stepNum ? '#fff' : 'var(--text-muted)',
                          border: i + 1 === stepNum ? '2px solid #ef4444' : '1px solid var(--border)',
                          boxShadow: i + 1 === stepNum ? '0 0 12px rgba(239,68,68,0.3)' : 'none'
                        }}>
                        {i + 1 < stepNum ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                      <span className="text-xs font-medium hidden sm:inline" style={{ color: i + 1 <= stepNum ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {label}
                      </span>
                    </div>
                    {i < 2 && <div className="h-px flex-1 mx-1" style={{ background: i + 1 < stepNum ? '#ef4444' : 'var(--border)' }} />}
                  </div>
                ))}
              </div>

              {/* Back button */}
              <button onClick={resetFlow} className="flex items-center gap-1 text-xs font-medium mb-4 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft size={14} /> Cancel and go back
              </button>

              {/* ── Step 1: Email ── */}
              {step === STEPS.EMAIL && (
                <form onSubmit={handleRequestOtp} className="animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    <Shield size={20} style={{ color: '#ef4444' }} />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      For security, please enter the email address associated with your account. A 6-digit verification code will be sent to confirm your identity.
                    </p>
                  </div>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      id="delete-email-input"
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      className="input-base input-with-icon"
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
                  <button type="submit" disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={16} />}
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </form>
              )}

              {/* ── Step 2: OTP ── */}
              {step === STEPS.OTP && (
                <form onSubmit={handleVerifyOtp} className="animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    <KeyRound size={20} style={{ color: '#f59e0b' }} />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      We've sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Enter it below. The code expires in 5 minutes.
                    </p>
                  </div>
                  {/* OTP inputs */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="input-base text-center"
                        style={{ width: 48, height: 56, fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Courier New', monospace", letterSpacing: 0, padding: 0, borderColor: digit ? '#ef4444' : undefined }}
                        id={`otp-input-${idx}`}
                      />
                    ))}
                  </div>
                  {error && <p className="text-xs font-medium text-center" style={{ color: '#ef4444' }}>{error}</p>}
                  <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button type="button" onClick={() => { setOtp(['','','','','','']); setStep(STEPS.EMAIL); setError('') }}
                    className="w-full text-center text-xs font-medium py-2" style={{ color: 'var(--text-muted)' }}>
                    Didn't receive the code? Go back
                  </button>
                </form>
              )}

              {/* ── Step 3: Final Confirmation ── */}
              {step === STEPS.CONFIRM && (
                <div className="animate-fade-in space-y-4">
                  <div className="p-5 rounded-xl text-center" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.12)' }}>
                      <AlertTriangle size={28} style={{ color: '#ef4444' }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Are you absolutely sure?</h3>
                    <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      This will <strong style={{ color: '#ef4444' }}>permanently delete</strong> your account
                      <strong style={{ color: 'var(--text-primary)' }}> @{user?.username}</strong> and all associated data.
                      A farewell email will be sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                    </p>
                    <div className="p-3 rounded-lg text-left mb-4" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.12)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#fca5a5' }}>What will be removed:</p>
                      <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                        <li>• Your profile, messages, and chat history</li>
                        <li>• All room memberships and created rooms</li>
                        <li>• Active subscriptions and payment data</li>
                        <li>• All uploaded media and files</li>
                      </ul>
                    </div>
                  </div>
                  {error && <p className="text-xs font-medium text-center" style={{ color: '#ef4444' }}>{error}</p>}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={resetFlow} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleConfirmDeletion} disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {loading ? 'Deleting...' : 'Delete My Account Forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Deleted: Success ── */}
          {step === STEPS.DELETED && (
            <div className="animate-fade-in text-center py-6">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Account Deleted</h3>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                Your account has been permanently removed.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                A confirmation email has been sent. Redirecting to login...
              </p>
              <div className="mt-4 w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
