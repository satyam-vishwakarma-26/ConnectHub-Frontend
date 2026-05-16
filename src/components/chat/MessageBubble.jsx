import { useState, useRef } from 'react'
import { MoreHorizontal, Edit3, Trash2, Reply, Check, CheckCheck, ShieldAlert, Download, FileText } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { formatMessageTime, formatFullTime } from '../../utils/helpers'
import { useAuthStore } from '../../context/authStore'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

const DELIVERY_ICONS = {
  SENT:      <Check size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />,
  DELIVERED: <CheckCheck size={12} style={{ color: 'rgba(206, 114, 114, 0.6)' }} />,
  READ:      <CheckCheck size={12} style={{ color: '#60d0ff' }} />,
}

export default function MessageBubble({
  message, onReact, onEdit, onDelete, onAdminDelete, onReply, onPin, canPin = false, canAdminDelete = false, showAvatar = true, onImageClick
}) {
  const { user } = useAuthStore()
  const isOwn = user?.id != null && String(message.senderId) === String(user.id)
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const menuRef = useRef(null)

  const getReactionMeta = (value, emoji) => {
    const count = Array.isArray(value) ? value.length : Number(value || 0)
    const fromUsersList = Array.isArray(value) && value.includes(user?.id)
    const fromLocalState = (message.myReactions || []).includes(emoji)
    return { count, isMine: fromUsersList || fromLocalState }
  }

  const isImageMessage = message.type === 'IMAGE' ||
    (message.mediaUrl && /\.(jpe?g|png|gif|webp|bmp|tiff|svg|avif|heic|heif)(\?.*)?$/i.test(message.mediaUrl))

  const hasText = Boolean(message.content && message.content.trim().length > 0);

  const getDownloadUrl = (url) => {
    if (!url) return '';
    if (message.type === 'FILE' || url.includes('/raw/upload/')) return url;
    return url.replace('/upload/', '/upload/fl_attachment/');
  };

  const getFileName = (url) => {
    if (!url) return 'Document / File';
    try {
      const parts = url.split('/');
      let filename = parts[parts.length - 1].split('?')[0];
      // Backend prefixes files with a 36-character UUID and a dash
      if (filename.length > 37 && filename.charAt(36) === '-') {
        filename = filename.substring(37);
      }
      return decodeURIComponent(filename);
    } catch (e) {
      return 'Document / File';
    }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <span className="text-xs italic px-3 py-1.5 rounded-full surface-card"
              style={{ color: 'var(--text-muted)' }}>
          Message deleted
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-end gap-3 mb-3 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {showAvatar && !isOwn ? (
        <Avatar
          user={{
            username: message.senderName,
            avatarUrl: message.senderAvatarUrl,
          }}
          size={30}
        />
      ) : (
        <div style={{ width: 30 }} />
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[78%]`}>
        {/* Sender name (for group rooms) */}
        {!isOwn && showAvatar && (
          <span className="text-[11px] font-semibold mb-1 ml-1 px-2 py-0.5 rounded-full surface-card uppercase tracking-[0.14em]"
                style={{ color: 'var(--brand)' }}>
            {message.senderName}
          </span>
        )}

        {/* Reply preview */}
        {message.replyToMessageId && (
          <div className="mb-1 px-3 py-2 rounded-2xl text-xs max-w-full surface-card"
               style={{
                 borderColor: 'var(--brand)',
                 color: 'var(--text-muted)',
                 borderLeftWidth: '3px',
                 borderLeftStyle: 'solid',
               }}>
            <span className="font-medium block">↩ Replying to message</span>
          </div>
        )}

        {/* Stacked Message Elements */}
        <div className="relative flex flex-col gap-1" style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          
          {/* Image */}
          {isImageMessage && message.mediaUrl && (
            <div className="relative group/image flex justify-start rounded-xl overflow-hidden shadow-sm" style={{ background: 'rgba(0,0,0,0.05)' }}>
              <img src={message.mediaUrl} alt="attachment"
                   onClick={() => onImageClick?.(message.mediaUrl)}
                   className="max-w-[240px] sm:max-w-xs md:max-w-md max-h-64 object-contain cursor-pointer transition-transform hover:scale-[1.02]" />
              <a 
                href={getDownloadUrl(message.mediaUrl)} 
                target="_blank" 
                rel="noopener noreferrer" 
                download={`image-${message.id}`}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-sm"
                title="Download Image"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={16} />
              </a>
            </div>
          )}

          {/* File */}
          {message.type === 'FILE' && message.mediaUrl && !isImageMessage && (
            <a href={getDownloadUrl(message.mediaUrl)} target="_blank" rel="noopener noreferrer" download={`file-${message.id}`}
               className={`flex items-center gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity no-underline w-[260px] sm:w-[320px] max-w-full ${isOwn ? 'msg-bubble-own border' : 'msg-bubble-other border'}`}
               style={{ borderColor: isOwn ? 'rgba(255,255,255,0.08)' : 'var(--border)' }}
               onClick={(e) => e.stopPropagation()}>
              <div className="p-2 rounded-lg shrink-0" style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-secondary)' }}>
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-sm font-medium truncate block" style={{ color: isOwn ? '#fff' : 'var(--text-primary)' }} title={getFileName(message.mediaUrl)}>
                  {getFileName(message.mediaUrl)}
                </p>
                <p className="text-[10px] opacity-70 mt-0.5 truncate block">PDF Document</p>
              </div>
              <div className="p-1.5 rounded-full shrink-0" style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)' }}>
                <Download size={14} />
              </div>
            </a>
          )}

          {/* Text Bubble & Meta */}
          {hasText ? (
            <div
              className={`max-w-full px-3 py-2 border ${isOwn ? 'msg-bubble-own' : 'msg-bubble-other'}`}
              style={{ borderColor: isOwn ? 'rgba(255,255,255,0.08)' : 'var(--border)' }}
            >
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {message.content}
              </p>
              <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] opacity-70">
                  {formatMessageTime(message.sentAt)}
                  {message.isEdited && ' · edited'}
                </span>
                {isOwn && (
                  <span>{DELIVERY_ICONS[message.deliveryStatus] || DELIVERY_ICONS.SENT}</span>
                )}
              </div>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] opacity-70" style={{ color: 'var(--text-muted)' }}>
                {formatMessageTime(message.sentAt)}
                {message.isEdited && ' · edited'}
              </span>
              {isOwn && (
                <span style={{ color: 'var(--text-muted)' }}>
                  {DELIVERY_ICONS[message.deliveryStatus] || DELIVERY_ICONS.SENT}
                </span>
              )}
            </div>
          )}

          {/* Hover actions */}
          <div
            className={`absolute top-0 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'}
                        flex items-center gap-0.5 opacity-0 group-hover:opacity-100
                        transition-opacity`}
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            {/* Quick reactions */}
            <div className="relative">
              <button
                onClick={() => setShowReactions(r => !r)}
                className="p-1.5 rounded-full surface-card text-sm hover:scale-105 transition-transform"
              >
                😊
              </button>
              {showReactions && (
                <div
                  className={`absolute bottom-full mb-1 flex gap-1 p-1.5 rounded-xl z-[100]
                              ${isOwn ? 'right-0' : 'left-0'}`}
                  style={{ boxShadow: '0 18px 44px rgba(15, 19, 33, 0.16)' }}
                >
                  {QUICK_REACTIONS.map(e => (
                    <button key={e} onClick={() => { onReact?.(message.id, e); setShowReactions(false) }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-base
                                       hover:scale-110 transition-transform surface-card">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => onReply?.(message)}
                    className="p-1.5 rounded-full surface-card transition-transform hover:scale-105"
                    style={{ color: 'var(--text-muted)' }}>
              <Reply size={13} />
            </button>

            {/* More Menu — show if own message OR admin controls available */}
            {(isOwn || canPin || canAdminDelete) && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(m => !m)}
                  aria-label="More actions"
                  className="p-1.5 rounded-full surface-card transition-transform hover:scale-105"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <MoreHorizontal size={13} />
                </button>
                {showMenu && (
                  <div
                    className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'}
                                min-w-[130px] rounded-xl overflow-hidden z-[100]`}
                    style={{ boxShadow: '0 18px 44px rgba(15, 19, 33, 0.16)' }}
                  >
                    {canPin && (
                      <button
                        onClick={() => { onPin?.(message); setShowMenu(false) }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-90 transition-opacity text-left surface-card"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <MoreHorizontal size={13} /> {message.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                    {isOwn && (
                      <>
                        {!message.mediaUrl && (
                          <button
                            onClick={() => { onEdit?.(message); setShowMenu(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-90 transition-opacity text-left surface-card"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => { onDelete?.(message.id); setShowMenu(false) }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-90 transition-opacity text-left surface-card"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </>
                    )}
                    {/* Admin delete — visible for non-own msgs when canAdminDelete=true */}
                    {!isOwn && canAdminDelete && (
                      <button
                        onClick={() => { onAdminDelete?.(message.id); setShowMenu(false) }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-90 transition-opacity text-left surface-card"
                        style={{ color: 'var(--danger)' }}
                      >
                        <ShieldAlert size={13} /> Admin Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reactions display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions).map(([emoji, reactionValue]) => {
              const meta = getReactionMeta(reactionValue, emoji)
              if (meta.count <= 0) return null

              return (
                <button
                  key={emoji}
                  onClick={() => onReact?.(message.id, emoji)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors surface-card"
                  style={{
                    background: meta.isMine ? 'var(--brand-light)' : 'var(--bg-secondary)',
                    borderColor: meta.isMine ? 'var(--brand)' : 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {emoji} <span>{meta.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
