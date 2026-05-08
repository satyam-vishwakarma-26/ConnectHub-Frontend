import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Lock, Save, User, AtSign, FileText, CheckCircle, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { messageApiService } from '../../api/messageApi'
import { Input, Textarea, Button, Badge } from '../../components/ui'
import Avatar from '../../components/ui/Avatar'
import { STATUS_LABELS, STATUS_COLORS, ROLE_LABELS, timeAgo } from '../../utils/helpers'
import toast from 'react-hot-toast'

const STATUSES = ['ONLINE', 'AWAY', 'DND', 'INVISIBLE']
const STATUS_ICONS = { ONLINE: '🟢', AWAY: '🟡', DND: '🔴', INVISIBLE: '⚫' }

export default function ProfilePage() {
  const { user, updateProfile, changePassword, updateStatus, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto pt-4 md:pt-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-0.5 p-2 rounded-xl transition-colors hover:opacity-70"
          style={{ color: 'var(--text-primary)', background: 'var(--bg-tertiary)' }}
          aria-label="Go back"
          title="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold"
              style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            My Profile
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Profile card */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="relative">
            <Avatar user={user} size={72} showStatus />
            <button
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2"
              style={{ background: 'var(--brand)', borderColor: 'var(--bg-secondary)' }}
              onClick={() => setTab('profile')}
            >
              <Camera size={12} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              {user?.fullName || user?.username}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge color={user?.role === 'PLATFORM_ADMIN' ? 'purple' : user?.role === 'ROOM_ADMIN' ? 'brand' : 'gray'}>
                {ROLE_LABELS[user?.role] || 'User'}
              </Badge>
              <Badge color={user?.isActive ? 'green' : 'red'}>
                {user?.isActive ? 'Active' : 'Suspended'}
              </Badge>
              {user?.provider !== 'LOCAL' && (
                <Badge color="yellow">{user?.provider} OAuth</Badge>
              )}
            </div>
            {user?.lastSeenAt && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Last seen {timeAgo(user.lastSeenAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 mb-6 p-1 rounded-xl"
           style={{ background: 'var(--bg-tertiary)' }}>
        {[
          { id: 'profile',  label: 'Edit Profile' },
          { id: 'password', label: 'Password' },
          { id: 'status',   label: 'Status' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all"
            style={{
              background:   tab === t.id ? 'var(--bg-secondary)' : 'transparent',
              color:        tab === t.id ? 'var(--brand)'         : 'var(--text-secondary)',
              boxShadow:    tab === t.id ? 'var(--shadow-sm)'     : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile'  && <EditProfileForm user={user} onSave={updateProfile} isLoading={isLoading} />}
      {tab === 'password' && <ChangePasswordForm onSave={changePassword} isLoading={isLoading} provider={user?.provider} />}
      {tab === 'status'   && <StatusForm currentStatus={user?.status} onSave={updateStatus} />}
    </div>
  )
}

// ── Edit Profile Form ─────────────────────────────────────
function EditProfileForm({ user, onSave, isLoading }) {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    bio:      user?.bio      || '',
    avatarUrl:user?.avatarUrl|| '',
  })
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    setAvatarPreview(form.avatarUrl || '')
  }, [form.avatarUrl])

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    else if (form.username.length < 3) e.username = 'Min 3 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    let avatarUrl = form.avatarUrl
    if (avatarFile) {
      setUploadingAvatar(true)
      try {
        const uploadRes = await messageApiService.uploadMedia(avatarFile)
        avatarUrl = uploadRes.data?.data?.mediaUrl || avatarUrl
      } catch {
        toast.error('Failed to upload profile picture')
        setUploadingAvatar(false)
        return
      } finally {
        setUploadingAvatar(false)
      }
    }

    const res = await onSave({ ...form, avatarUrl })
    if (res.success) {
      setForm(prev => ({ ...prev, avatarUrl }))
      setAvatarFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSaved(true)
      toast.success('Profile updated!')
      setTimeout(() => setSaved(false), 2000)
    } else {
      toast.error(res.message)
    }
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result || '')
    reader.readAsDataURL(file)
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Full Name" value={form.fullName}
               onChange={set('fullName')} icon={User} placeholder="Alice Smith" />
        <Input label="Username" value={form.username}
               onChange={set('username')} icon={AtSign}
               placeholder="alice_dev" error={errors.username} />
      </div>
      <Textarea label="Bio" value={form.bio} onChange={set('bio')}
                placeholder="Tell others about yourself..." rows={3} />
      <Input label="Avatar URL" value={form.avatarUrl}
             onChange={set('avatarUrl')} icon={Camera}
             placeholder="https://..." />

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Upload Profile Picture
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="block w-full text-sm"
          style={{ color: 'var(--text-secondary)' }}
        />
        {avatarFile && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Selected: {avatarFile.name}
          </p>
        )}
      </div>

      {avatarPreview && (
        <div className="flex items-center gap-3 p-3 rounded-xl"
             style={{ background: 'var(--bg-tertiary)' }}>
          <img src={avatarPreview} alt="preview" className="w-12 h-12 rounded-full object-cover" />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avatar preview</span>
        </div>
      )}

      <Button type="submit" loading={isLoading || uploadingAvatar} className="w-full"
              icon={saved ? CheckCircle : Save}
              style={saved ? { background: 'var(--success)' } : {}}>
        {saved ? 'Saved!' : 'Save Changes'}
      </Button>
    </form>
  )
}

// ── Change Password Form ──────────────────────────────────
function ChangePasswordForm({ onSave, isLoading, provider }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  if (provider !== 'LOCAL') {
    return (
      <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
        <Lock size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Password change not available
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Your account uses {provider} OAuth. Manage your password through {provider}.
        </p>
      </div>
    )
  }

  const validate = () => {
    const e = {}
    if (!form.currentPassword) e.currentPassword = 'Current password required'
    if (!form.newPassword) e.newPassword = 'New password required'
    else if (form.newPassword.length < 6) e.newPassword = 'Min 6 characters'
    if (form.newPassword !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const res = await onSave({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    if (res.success) {
      toast.success('Password changed! All sessions invalidated.')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } else {
      toast.error(res.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      <Input label="Current Password" type="password" icon={Lock}
             value={form.currentPassword} onChange={set('currentPassword')}
             error={errors.currentPassword} placeholder="••••••••" />

      {/* Forgot Password link */}
      <div className="flex justify-end -mt-2">
        <button
          type="button"
          onClick={() => navigate('/forgot-password')}
          className="text-xs font-medium hover:underline"
          style={{ color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Forgot your password?
        </button>
      </div>

      <Input label="New Password" type="password" icon={Lock}
             value={form.newPassword} onChange={set('newPassword')}
             error={errors.newPassword} placeholder="Min 6 characters" />
      <Input label="Confirm New Password" type="password" icon={Lock}
             value={form.confirm} onChange={set('confirm')}
             error={errors.confirm} placeholder="Repeat new password" />
      <Button type="submit" loading={isLoading} icon={Save} className="w-full">
        Change Password
      </Button>
    </form>
  )
}

// ── Status Form ───────────────────────────────────────────
function StatusForm({ currentStatus, onSave }) {
  const [selected, setSelected] = useState(currentStatus || 'ONLINE')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const res = await onSave(selected)
    setSaving(false)
    if (res.success) toast.success(`Status set to ${STATUS_LABELS[selected]}`)
    else toast.error(res.message)
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-4">
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Choose your online status
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left"
            style={{
              borderColor:  selected === s ? 'var(--brand)' : 'var(--border)',
              background:   selected === s ? 'var(--brand-light)' : 'var(--bg-tertiary)',
              color:        'var(--text-primary)',
            }}
          >
            <span className="text-xl">{STATUS_ICONS[s]}</span>
            <div>
              <p className="font-medium text-sm">{STATUS_LABELS[s]}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {s === 'ONLINE'    && 'Visible to everyone'}
                {s === 'AWAY'      && 'Show as away'}
                {s === 'DND'       && 'Mute notifications'}
                {s === 'INVISIBLE' && 'Appear offline'}
              </p>
            </div>
          </button>
        ))}
      </div>
      <Button onClick={handleSave} loading={saving} icon={Save} className="w-full">
        Save Status
      </Button>
    </div>
  )
}
