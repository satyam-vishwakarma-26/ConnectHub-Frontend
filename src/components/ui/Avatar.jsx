import { getInitials, getAvatarGradient, STATUS_COLORS } from '../../utils/helpers'

export default function Avatar({ user, size = 36, showStatus = false, className = '' }) {
  const fontSize = size < 32 ? 11 : size < 48 ? 13 : 16

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}
         style={{ width: size, height: size }}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          className="avatar w-full h-full"
        />
      ) : (
        <div
          className="avatar-placeholder w-full h-full select-none"
          style={{
            background: getAvatarGradient(user?.username || user?.email || ''),
            fontSize,
          }}
        >
          {getInitials(user?.fullName || user?.username || '?')}
        </div>
      )}

      {showStatus && user?.status && (
        <span
          className={`presence-ring ${STATUS_COLORS[user.status] || 'status-invisible'}`}
          style={{ width: Math.max(8, size * 0.25), height: Math.max(8, size * 0.25) }}
        />
      )}
    </div>
  )
}
