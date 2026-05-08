import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageSquare, UserCheck } from 'lucide-react'
import { authApiService } from '../../api/authApi'
import { Input, Spinner, Badge } from '../../components/ui'
import Avatar from '../../components/ui/Avatar'
import { STATUS_LABELS, STATUS_COLORS, ROLE_LABELS, timeAgo } from '../../utils/helpers'
import { useAuthStore } from '../../context/authStore'
import toast from 'react-hot-toast'

export default function SearchUsersPage() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { user: me } = useAuthStore()
  const navigate = useNavigate()

  const handleSearch = useCallback(async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await authApiService.searchUsers(query.trim())
      setResults(res.data.data || [])
    } catch (err) {
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [query])

  const startDm = (userId) => {
    navigate(`/chat/dm/${userId}`)
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto pt-14 md:pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
          Find Users
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Search by username or full name to start a conversation
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name or username"
            icon={Search}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary px-5"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          {loading ? <Spinner size={16} /> : 'Search'}
        </button>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state-card text-center py-14">
          <Search size={48} className="mx-auto mb-4 opacity-30"
                  style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            No users found
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Try a different search term
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          {results.map(u => (
            <UserCard
              key={u.id}
              user={u}
              isMe={u.id === me?.id}
              onMessage={() => startDm(u.id)}
            />
          ))}
        </div>
      )}

      {!searched && (
        <div className="empty-state-card text-center py-14">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
            <Search size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Search for people
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Find users by their username or full name
          </p>
        </div>
      )}
    </div>
  )
}

// ── User Result Card ──────────────────────────────────────
function UserCard({ user, isMe, onMessage }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-orange-400/30 transition-colors">
      <Avatar user={user} size={48} showStatus />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}>
            {user.fullName || user.username}
          </span>
          {isMe && <Badge color="brand">You</Badge>}
          <Badge color={user.role === 'PLATFORM_ADMIN' ? 'purple' : 'gray'}>
            {ROLE_LABELS[user.role] || 'User'}
          </Badge>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          @{user.username}
        </p>
        {user.bio && (
          <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
            {user.bio}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[user.status]}`} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {STATUS_LABELS[user.status] || 'Offline'}
            {user.lastSeenAt && user.status === 'INVISIBLE' && (
              <> · Last seen {timeAgo(user.lastSeenAt)}</>
            )}
          </span>
        </div>
      </div>
      {!isMe && (
        <button
          onClick={onMessage}
          className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm shrink-0"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <MessageSquare size={15} />
          Message
        </button>
      )}
    </div>
  )
}
