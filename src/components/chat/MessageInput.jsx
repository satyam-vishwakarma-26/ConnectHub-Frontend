import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X } from 'lucide-react'
import { wsService } from '../../api/wsService'

export default function MessageInput({ roomId, recipientId, onSend, replyTo, onCancelReply, disabled }) {
  const [text, setText] = useState('')
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentType, setAttachmentType] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimer = useRef(null)
  const isTyping = useRef(false)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'
  }, [text])

  // Focus on mount and when replyTo changes
  useEffect(() => {
    textareaRef.current?.focus()
  }, [replyTo])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const sendTyping = (typing) => {
    if ((!roomId && !recipientId) || !wsService.isConnected()) return
    if (typing !== isTyping.current) {
      isTyping.current = typing
      wsService.sendTyping(roomId, recipientId, typing)
    }
  }

  const handleChange = (e) => {
    setText(e.target.value)
    sendTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => sendTyping(false), 2500)
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if ((!trimmed && !attachmentFile) || disabled) return
    sendTyping(false)
    clearTimeout(typingTimer.current)

    if (attachmentFile) {
      onSend(trimmed, attachmentType || 'FILE', replyTo?.id || null, null, attachmentFile)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setAttachmentFile(null)
      setAttachmentType('')
      setImagePreview('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      onSend(trimmed, 'TEXT', replyTo?.id || null)
    }

    setText('')
    onCancelReply?.()
    textareaRef.current?.focus()
  }

  const isImageFile = (file) => {
    if (!file) return false
    const mimeType = file.type?.toLowerCase()
    if (mimeType?.startsWith('image/')) return true

    const extension = file.name?.split('.').pop()?.toLowerCase() || ''
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'avif', 'heic', 'heif'].includes(extension)
  }

  const handlePickAttachment = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = isImageFile(file)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setAttachmentFile(file)
    setAttachmentType(isImage ? 'IMAGE' : 'FILE')
    setImagePreview(isImage ? URL.createObjectURL(file) : '')
  }

  const clearAttachment = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setAttachmentFile(null)
    setAttachmentType('')
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-xl"
             style={{ background: 'var(--bg-tertiary)', borderLeft: '3px solid var(--brand)' }}>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              Replying to {replyTo.senderName}
            </span>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {replyTo.content}
            </p>
          </div>
          <button onClick={onCancelReply} className="shrink-0" style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {attachmentFile && (
        <div className="mb-2 px-3 py-2 rounded-xl"
             style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <Paperclip size={18} style={{ color: 'var(--text-muted)' }} />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {attachmentFile.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(attachmentFile.size / 1024).toFixed(1)} KB{attachmentType ? ` · ${attachmentType}` : ''}
                </p>
              </div>
            </div>
            <button onClick={clearAttachment} className="shrink-0" style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl mb-0.5 transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
          title="Attach image or file"
        >
          <Paperclip size={18} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
          className="hidden"
          onChange={handlePickAttachment}
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'You are muted in this room' : 'Write a message...'}
            disabled={disabled}
            rows={1}
            className="input-base resize-none py-2.5 pr-10 leading-relaxed"
            style={{
              minHeight: 44,
              maxHeight: 150,
              lineHeight: 1.5,
              opacity: disabled ? 0.5 : 1,
            }}
          />
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !attachmentFile) || disabled}
          className="p-2.5 rounded-xl mb-0.5 transition-all"
          style={{
            background:   (text.trim() || attachmentFile) && !disabled ? 'var(--brand)' : 'var(--bg-tertiary)',
            color:        (text.trim() || attachmentFile) && !disabled ? '#fff' : 'var(--text-muted)',
            boxShadow:    (text.trim() || attachmentFile) && !disabled ? '0 0 16px rgba(86,182,198,0.30)' : 'none',
            transform:    (text.trim() || attachmentFile) && !disabled ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
        <kbd className="px-1 py-0.5 rounded text-xs"
             style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          Enter
        </kbd>
        {' '}to send ·{' '}
        <kbd className="px-1 py-0.5 rounded text-xs"
             style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          Shift+Enter
        </kbd>
        {' '}for newline
      </p>
    </div>
  )
}
