import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, X, Loader2, CreditCard, ShieldCheck, Zap, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useSubscriptionStore } from '../../context/subscriptionStore'
import { paymentApiService } from '../../api/paymentApi'
import { loadRazorpayScript, formatDate } from '../../utils/paymentUtils'

// Steps: 1 = Review, 2 = Processing, 3 = Success, 4 = Failure
const STEP_REVIEW   = 1
const STEP_PAYING   = 2
const STEP_SUCCESS  = 3
const STEP_FAILURE  = 4

// ── PRO features shown in review card ─────────────────────
const PRO_FEATURES = [
  'Unlimited rooms',
  'Unlimited members per room',
  'Message reactions & read receipts',
  'Custom room avatars',
  'Priority notifications',
  '100 MB file uploads',
  'Full message history',
  'Multi-device support',
]

// ── Step 1: Review Order ──────────────────────────────────
function ReviewStep({ onPay, loading }) {
  return (
    <div className="animate-fade-in">
      {/* PRO Plan card */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{
          background: 'linear-gradient(145deg, #1e1b4b, #312e81)',
          border: '1px solid rgba(99,102,241,0.4)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.2)',
        }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-indigo-700/40">
          <div className="flex items-center justify-between">
            <div>
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-2"
                style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}
              >
                ⭐ PRO Plan
              </span>
              <h3 className="text-xl font-black text-white">Monthly Subscription</h3>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white">₹199</div>
              <div className="text-xs text-indigo-300">per month</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
          {PRO_FEATURES.map(f => (
            <div key={f} className="flex items-center gap-2">
              <Check size={13} className="text-green-400 shrink-0" strokeWidth={2.5} />
              <span className="text-xs text-indigo-200">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <h4 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Order Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>ConnectHub PRO — 1 Month</span>
            <span style={{ color: 'var(--text-primary)' }}>₹199.00</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>GST</span>
            <span style={{ color: 'var(--text-muted)' }}>Inclusive</span>
          </div>
          <div
            className="flex justify-between font-bold pt-2 border-t"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <span>Total</span>
            <span>₹199.00</span>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {[
          { icon: <ShieldCheck size={14} />, text: 'Secure Razorpay' },
          { icon: <CreditCard size={14} />, text: 'UPI, Cards, Netbanking' },
          { icon: <Zap size={14} />, text: 'Instant activation' },
        ].map(b => (
          <div key={b.text} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {b.icon} {b.text}
          </div>
        ))}
      </div>

      <button
        onClick={onPay}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Opening Payment…</>
          : <>⚡ Proceed to Pay ₹199</>
        }
      </button>
    </div>
  )
}

// ── Step 2: Processing (spinner overlay) ─────────────────
function ProcessingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'rgba(99,102,241,0.12)', border: '2px solid rgba(99,102,241,0.3)' }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Initialising Payment…
      </h3>
      <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
        Please do not close this window. You'll be redirected to Razorpay to complete your payment.
      </p>
    </div>
  )
}

// ── Step 3: Success ───────────────────────────────────────
function SuccessStep({ endDate, onDashboard }) {
  const [countdown, setCountdown] = useState(4)

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (countdown <= 0) onDashboard()
  }, [countdown, onDashboard])

  return (
    <div className="flex flex-col items-center justify-center py-10 animate-slide-up text-center">
      {/* Animated checkmark */}
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 0 0 16px rgba(34,197,94,0.12), 0 8px 32px rgba(34,197,94,0.3)',
          }}
        >
          <Check size={44} className="text-white" strokeWidth={3} />
        </div>
        {/* Confetti rings */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-20"
             style={{ background: 'rgba(34,197,94,0.5)' }} />
      </div>

      <h2
        className="text-3xl font-black mb-3"
        style={{ fontFamily: 'Syne, sans-serif', background: 'linear-gradient(135deg, #6366f1, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        🎉 Welcome to PRO!
      </h2>

      <p className="text-base mb-2" style={{ color: 'var(--text-secondary)' }}>
        Your payment was successful.
      </p>

      {endDate && (
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#22c55e',
          }}
        >
          <Zap size={14} />
          PRO active until {formatDate(endDate)}
        </div>
      )}

      <button
        onClick={onDashboard}
        className="w-full max-w-xs py-3.5 rounded-xl font-bold text-white mb-3 transition-all"
        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
      >
        Go to Dashboard
      </button>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Redirecting in {countdown}s…
      </p>
    </div>
  )
}

// ── Step 4: Failure ───────────────────────────────────────
function FailureStep({ errorMsg, onRetry }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-10 animate-slide-up text-center">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          boxShadow: '0 0 0 16px rgba(239,68,68,0.1), 0 8px 32px rgba(239,68,68,0.25)',
        }}
      >
        <X size={44} className="text-white" strokeWidth={3} />
      </div>

      <h2
        className="text-2xl font-black mb-3"
        style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
      >
        Payment Failed
      </h2>

      <p className="text-sm max-w-xs mb-8" style={{ color: 'var(--text-muted)' }}>
        {errorMsg || 'Something went wrong. Please try again.'}
      </p>

      <button
        onClick={onRetry}
        className="w-full max-w-xs py-3.5 rounded-xl font-bold text-white mb-3 transition-all"
        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
      >
        Try Again
      </button>

      <button
        onClick={() => navigate('/pricing')}
        className="text-sm font-medium transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        ← View Plans
      </button>
    </div>
  )
}

// ── Main CheckoutPage ─────────────────────────────────────
export default function CheckoutPage() {
  const { accessToken } = useAuthStore()
  const { markAsPro, fetchSubscription, fetchLimits } = useSubscriptionStore()
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

  const [step, setStep]       = useState(STEP_REVIEW)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successEndDate, setSuccessEndDate] = useState(null)

  // Redirect to /login if not authenticated
  if (!accessToken) {
    return <Navigate to="/login" state={{ from: '/payment/checkout' }} replace />
  }

  // ── Core payment flow ───────────────────────────────────
  const handlePay = async () => {
    setLoading(true)
    setStep(STEP_PAYING)

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error('Failed to load Razorpay. Check your internet connection.')

      // 2. Create order
      const orderRes = await paymentApiService.createOrder({ planName: 'PRO' })
      const order    = orderRes.data

      // 3. Open Razorpay checkout
      await new Promise((resolve, reject) => {
        const options = {
          key:         order.razorpayKeyId,
          amount:      19900, // ₹199 in paise
          currency:    'INR',
          name:        'ConnectHub',
          description: 'PRO Plan - Monthly Subscription',
          order_id:    order.razorpayOrderId,
          theme:       { color: '#6366f1' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user')),
          },
          handler: async (razorpayResponse) => {
            try {
              // 4. Verify payment
              const verifyRes = await paymentApiService.verifyPayment({
                razorpayOrderId:   order.razorpayOrderId,
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
                planName: 'PRO',
              })

              const result = verifyRes.data

              // 5. Update Zustand + React Query
              markAsPro(result.endDate)
              await fetchSubscription()
              await fetchLimits()
              queryClient.invalidateQueries({ queryKey: ['subscription'] })
              queryClient.invalidateQueries({ queryKey: ['limits'] })
              queryClient.invalidateQueries({ queryKey: ['paymentHistory'] })

              setSuccessEndDate(result.endDate)
              toast.success('Payment successful! Welcome to PRO 🎉')
              resolve()
            } catch (err) {
              reject(err)
            }
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      })

      setStep(STEP_SUCCESS)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed. Please try again.'
      // If user cancelled, go back to review; else show failure screen
      if (msg.includes('cancelled')) {
        setStep(STEP_REVIEW)
        toast.error('Payment cancelled.')
      } else {
        setErrorMsg(msg)
        toast.error('Payment failed. Please try again.')
        setStep(STEP_FAILURE)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setStep(STEP_REVIEW)
    setErrorMsg('')
  }

  const handleDashboard = () => navigate('/chat')

  // ── Progress stepper titles ─────────────────────────────
  const stepTitles = {
    [STEP_REVIEW]:  'Review Order',
    [STEP_PAYING]:  'Processing Payment',
    [STEP_SUCCESS]: 'Payment Successful',
    [STEP_FAILURE]: 'Payment Failed',
  }

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-start py-12 px-4 sm:px-8 relative overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #a855f7, transparent)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Back button (only on review step) */}
        {step === STEP_REVIEW && (
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-sm mb-6 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={16} /> Back to Plans
          </button>
        )}

        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
          }}
        >
          {/* Top gradient bar */}
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #f59e0b)' }} />

          {/* Header */}
          {(step === STEP_REVIEW || step === STEP_PAYING) && (
            <div className="px-8 pt-7 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="text-xl font-black"
                    style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
                  >
                    {stepTitles[step]}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Powered by Razorpay — India's #1 payment gateway
                  </p>
                </div>
                {/* Step indicator dots */}
                <div className="flex items-center gap-1.5">
                  {[STEP_REVIEW, STEP_PAYING].map(s => (
                    <div
                      key={s}
                      className="rounded-full transition-all"
                      style={{
                        width: step === s ? 20 : 8,
                        height: 8,
                        background: step >= s ? '#6366f1' : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-8 py-6">
            {step === STEP_REVIEW  && <ReviewStep  onPay={handlePay} loading={loading} />}
            {step === STEP_PAYING  && <ProcessingStep />}
            {step === STEP_SUCCESS && <SuccessStep endDate={successEndDate} onDashboard={handleDashboard} />}
            {step === STEP_FAILURE && <FailureStep errorMsg={errorMsg} onRetry={handleRetry} />}
          </div>
        </div>
      </div>
    </div>
  )
}
