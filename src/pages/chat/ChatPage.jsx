import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Hash, Users, Search, MoreVertical, X, ChevronLeft,
  Pin, MessageCircle, UserPlus, VolumeX, Volume2, Shield, ShieldOff, Trash2,
  LogOut, Eraser, Camera, Edit3, Palette, CheckCircle2
} from 'lucide-react'
import { useMessages }        from '../../hooks/useMessages'
import MessageBubble          from '../../components/chat/MessageBubble'
import MessageInput           from '../../components/chat/MessageInput'
import Avatar                 from '../../components/ui/Avatar'
import { Spinner }            from '../../components/ui'
import { authApiService }     from '../../api/authApi'
import { roomApiService }     from '../../api/roomApi'
import { messageApiService }  from '../../api/messageApi'
import { presenceApiService } from '../../api/presenceApi'
import { wsService }          from '../../api/wsService'
import { useAuthStore }       from '../../context/authStore'
import { useNotificationCenter } from '../../context/NotificationCenterContext'
import toast from 'react-hot-toast'
import { Modal, Button, Input } from '../../components/ui'
import {
  STATUS_COLORS, STATUS_LABELS, getAvatarGradient, formatMessageTime, formatRelativeTime, timeAgo,
} from '../../utils/helpers'

// Status color map for the dot
const STATUS_DOT_COLOR = {
  ONLINE:    '#8ACBD0',
  AWAY:      '#56B6C6',
  DND:       '#170C79',
  INVISIBLE: '#6b7280',
}

export const CHAT_THEMES = [
  { id: 'default', name: 'ConnectHub Default', gradient: 'linear-gradient(135deg, var(--brand), var(--blue))', shadow: 'rgba(99, 102, 241, 0.3)' },
  { id: 'sunset', name: 'Sunset Glow', gradient: 'linear-gradient(135deg, #f97316, #ec4899)', shadow: 'rgba(249, 115, 22, 0.3)' },
  { id: 'ocean', name: 'Deep Ocean', gradient: 'linear-gradient(135deg, #0d9488, #3b82f6)', shadow: 'rgba(13, 148, 136, 0.3)' },
  { id: 'forest', name: 'Mystic Forest', gradient: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16, 185, 129, 0.3)' },
  { id: 'midnight', name: 'Midnight Purple', gradient: 'linear-gradient(135deg, #312e81, #7e22ce)', shadow: 'rgba(126, 34, 206, 0.3)' },
]

export const PAGE_BACKGROUNDS = [
  { id: 'default', name: 'Default Dark', style: undefined },
  { id: 'abyss', name: 'The Abyss', style: 'linear-gradient(to bottom, #000000, #0a0a14)' },
  { id: 'nebula', name: 'Nebula', style: 'radial-gradient(circle at top right, rgba(126,34,206,0.1), transparent 50%), radial-gradient(circle at bottom left, rgba(13,148,136,0.1), transparent 50%)' },
  { id: 'aurora', name: 'Aurora', style: 'radial-gradient(ellipse at top, rgba(16,185,129,0.08), transparent 50%), radial-gradient(ellipse at bottom, rgba(59,130,246,0.08), transparent 50%)' },
  { id: 'crimson', name: 'Crimson Night', style: 'radial-gradient(circle at center, rgba(225,29,72,0.06), transparent 80%)' },
]

export default function ChatPage() {
  const { roomId, userId } = useParams()
  const navigate           = useNavigate()
  const { user }           = useAuthStore()
  const { markChatAsRead } = useNotificationCenter()
  const bottomRef          = useRef(null)
  const disablePresenceRef = useRef(false)

  const [room, setRoom]               = useState(null)
  const [replyTo, setReplyTo]         = useState(null)
  const [editMsg, setEditMsg]         = useState(null)
  const [editText, setEditText]       = useState('')
  const [userCache, setUserCache]     = useState({})
  const [presenceMap, setPresenceMap] = useState({})
  const [members, setMembers]         = useState([])
  const [pinnedMsgs, setPinnedMsgs]   = useState([])
  const [memberPanelOpen, setMemberPanelOpen] = useState(false)

  // Search
  const [searchOpen, setSearchOpen]     = useState(false)
  const [searchQ, setSearchQ]           = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Add member
  const [addMemberOpen, setAddMemberOpen]     = useState(false)
  const [addMemberQuery, setAddMemberQuery]   = useState('')
  const [addMemberResults, setAddMemberResults] = useState([])
  const [addMemberSearching, setAddMemberSearching] = useState(false)
  const [addMemberLoading, setAddMemberLoading]   = useState(false)
  const [newMemberRole, setNewMemberRole] = useState('MEMBER')

  // Room profile edit
  const [roomProfileOpen, setRoomProfileOpen] = useState(false)
  const [roomEditForm, setRoomEditForm] = useState({ name: '', description: '', avatarUrl: '' })
  const [roomAvatarFile, setRoomAvatarFile] = useState(null)
  const [roomAvatarPreview, setRoomAvatarPreview] = useState(null)
  const [roomEditLoading, setRoomEditLoading] = useState(false)
  const roomAvatarInputRef = useRef(null)

  // DM Peer Profile
  const [peerProfileOpen, setPeerProfileOpen] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState(null)

  // Chat Theme
  const [activeMsgTheme, setActiveMsgTheme] = useState('default')
  const [activeBgTheme, setActiveBgTheme] = useState('default')
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false)
  const [customizingType, setCustomizingType] = useState('message') // 'message' | 'background'

  const describeError = useCallback((err) => {
    const s = err?.response?.status
    if (s) return `HTTP ${s}`
    if (err?.code === 'ERR_NETWORK') return 'network error'
    return err?.message || 'unknown error'
  }, [])

  const directPeerId  = userId ? Number(userId) : null
  const isDirectChat  = !roomId && Number.isFinite(directPeerId)
  const activeRoomId  = roomId || room?.id

  const isAdmin       = members.find(m => m.userId === user?.id)?.role === 'ADMIN'
  const amIMuted      = members.find(m => m.userId === user?.id)?.isMuted === true

  const {
    messages, loading, hasMore, loadMore,
    sendMessage, reactToMessage, editMessage, deleteMessage, clearAllMessages, clearLocalChat, deleteLocalMessage, typingUsers,
  } = useMessages({
    roomId:      activeRoomId,
    otherUserId: isDirectChat ? directPeerId : null,
  })

  // Clear unread notifications when viewing this chat
  useEffect(() => {
    if (isDirectChat && directPeerId) {
      markChatAsRead(null, directPeerId)
    } else if (!isDirectChat && activeRoomId) {
      markChatAsRead(activeRoomId, null)
    }
  }, [isDirectChat, activeRoomId, directPeerId, messages, markChatAsRead])

  // ── Load DM peer profile + ensure DM room exists ────────
  useEffect(() => {
    if (!isDirectChat || !directPeerId) return

    // Load peer profile for display
    authApiService.getProfileById(directPeerId)
      .then(res => {
        const peer = res.data?.data
        if (peer) setUserCache(c => ({ ...c, [directPeerId]: peer }))
      })
      .catch(() => {})

    // Ensure a DM room exists in the backend so this conversation
    // persists across page refreshes (getMyRooms will return it).
    if (directPeerId !== user?.id) {
      roomApiService.getOrCreateDm(directPeerId).catch(() => {})
    }
  }, [isDirectChat, directPeerId, user?.id])

  // ── Fetch room data, members, presence ────────────────
  useEffect(() => {
    if (isDirectChat || !activeRoomId) return

    const load = async () => {
      const [roomRes, membersRes, pinnedRes] = await Promise.allSettled([
        roomApiService.getById(activeRoomId),
        roomApiService.getMembers(activeRoomId),
        messageApiService.getPinnedMessages(activeRoomId),
      ])

      let roomMembers = []
      const failures  = []

      if (roomRes.status === 'fulfilled') {
        setRoom(roomRes.value?.data?.data || null)
      } else {
        failures.push(`room (${describeError(roomRes.reason)})`)
      }

      if (membersRes.status === 'fulfilled') {
        roomMembers = membersRes.value?.data?.data || []
        setMembers(roomMembers)
      } else {
        setMembers([])
        failures.push(`members (${describeError(membersRes.reason)})`)
      }

      if (pinnedRes.status === 'fulfilled') {
        setPinnedMsgs(pinnedRes.value?.data?.data || [])
      } else {
        setPinnedMsgs([])
      }

      // Presence for members
      if (roomMembers.length && !disablePresenceRef.current) {
        try {
          const ids = roomMembers.map(m => m.userId)
          const pRes = await presenceApiService.getBulk(ids)
          const map = (pRes.data?.data || []).reduce((acc, p) => {
            acc[p.userId] = p; return acc
          }, {})
          setPresenceMap(map)
        } catch (err) {
          setPresenceMap({})
          if (err?.response?.status === 403) disablePresenceRef.current = true
        }
      }

      if (failures.length) toast.error(`Failed to load: ${failures.join(', ')}`)

      // Best-effort read receipt
      roomApiService.updateLastRead(activeRoomId, { readAt: new Date().toISOString() }).catch(() => {})
    }

    load()
  }, [activeRoomId, isDirectChat, describeError])

  // Load Theme
  useEffect(() => {
    const keyMsg = activeRoomId ? `chat_theme_msg_room_${activeRoomId}` : (directPeerId ? `chat_theme_msg_dm_${directPeerId}` : null)
    const keyBg = activeRoomId ? `chat_theme_bg_room_${activeRoomId}` : (directPeerId ? `chat_theme_bg_dm_${directPeerId}` : null)
    if (keyMsg) {
      setActiveMsgTheme(localStorage.getItem(keyMsg) || 'default')
    }
    if (keyBg) {
      setActiveBgTheme(localStorage.getItem(keyBg) || 'default')
    }
  }, [activeRoomId, directPeerId])

  const handleMsgThemeChange = (themeId) => {
    setActiveMsgTheme(themeId)
    const key = activeRoomId ? `chat_theme_msg_room_${activeRoomId}` : (directPeerId ? `chat_theme_msg_dm_${directPeerId}` : null)
    if (key) localStorage.setItem(key, themeId)
  }

  const handleBgThemeChange = (themeId) => {
    setActiveBgTheme(themeId)
    const key = activeRoomId ? `chat_theme_bg_room_${activeRoomId}` : (directPeerId ? `chat_theme_bg_dm_${directPeerId}` : null)
    if (key) localStorage.setItem(key, themeId)
  }

  // ── Real-time presence via WebSocket ─────────────────
  // Updates the local presenceMap whenever a PRESENCE_UPDATE event
  // arrives — keeps the chat header and member panel dot accurate.
  useEffect(() => {
    const handlePresence = (frame) => {
      if (frame.type !== 'PRESENCE_UPDATE' || !frame.userId) return
      setPresenceMap(prev => ({
        ...prev,
        [frame.userId]: {
          ...(prev[frame.userId] || {}),
          userId: frame.userId,
          status: frame.status || 'INVISIBLE',
          customMessage: frame.customMessage ?? prev[frame.userId]?.customMessage,
          lastSeenAt: frame.status === 'ONLINE'
            ? null
            : (frame.lastSeenAt ?? prev[frame.userId]?.lastSeenAt),
        },
      }))
    }
    wsService.subscribeToPresence(handlePresence)

    // Re-fetch after WS connects so we get the authoritative state
    // instead of the stale snapshot from the initial HTTP call.
    const detach = wsService.onConnect(() => {
      if (disablePresenceRef.current) return
      const ids = isDirectChat
        ? (directPeerId ? [directPeerId] : [])
        : members.map(m => m.userId).filter(Boolean)
      if (!ids.length) return
      presenceApiService.getBulk(ids)
        .then(res => {
          const map = (res.data?.data || []).reduce((acc, p) => {
            acc[p.userId] = p; return acc
          }, {})
          setPresenceMap(prev => ({ ...prev, ...map }))
        })
        .catch(err => {
          if (err?.response?.status === 403) disablePresenceRef.current = true
        })
    })

    if (wsService.isConnected()) {
      const ids = isDirectChat
        ? (directPeerId ? [directPeerId] : [])
        : members.map(m => m.userId).filter(Boolean)
      if (ids.length) {
        presenceApiService.getBulk(ids)
          .then(res => {
            const map = (res.data?.data || []).reduce((acc, p) => {
              acc[p.userId] = p; return acc
            }, {})
            setPresenceMap(prev => ({ ...prev, ...map }))
          })
          .catch(err => {
            if (err?.response?.status === 403) disablePresenceRef.current = true
          })
      }
    }

    return () => {
      wsService.unsubscribeFromPresence(handlePresence)
      detach()
    }
  }, [isDirectChat, directPeerId, members])


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

    // Mark messages as read when they arrive and we're viewing the conversation
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]

      if (activeRoomId && !isDirectChat) {
        // Room: send a WebSocket read receipt
        wsService.sendReadReceipt(activeRoomId, lastMsg.id)
      }

      // DM: mark unread messages from the other person as READ
      if (isDirectChat && directPeerId) {
        const unreadFromPeer = messages.filter(
          m => Number(m.senderId) === Number(directPeerId) &&
               m.deliveryStatus && m.deliveryStatus !== 'READ'
        )
        unreadFromPeer.forEach(m => {
          messageApiService.updateStatus(m.id, 'READ')
            .then(() => {
              // Notify the sender via WebSocket so their tick updates in real-time
              wsService.sendStatusUpdate(m.id, m.senderId, null, 'READ')
            })
            .catch(() => {})
        })
      }
    }
  }, [messages.length])

  // ── Infinite scroll ────────────────────────────────────
  const handleScroll = useCallback((e) => {
    if (e.target.scrollTop < 80 && hasMore && !loading) loadMore()
  }, [hasMore, loading, loadMore])

  // ── Resolve user from cache ────────────────────────────
  const resolveUser = useCallback(async (uid) => {
    if (userCache[uid]) return userCache[uid]
    try {
      const res = await authApiService.getProfileById(uid)
      const u = res.data.data
      setUserCache(c => ({ ...c, [uid]: u }))
      return u
    } catch { return null }
  }, [userCache])

  // Prefetch senders + members
  useEffect(() => {
    const ids = new Set([
      ...messages.map(m => m.senderId),
      ...members.map(m => m.userId),
    ])
    ids.forEach(id => { if (!userCache[id]) resolveUser(id) })
  }, [messages, members])

  // ── Enriched messages (with sender names) ─────────────
  const enrichedMessages = messages.map(m => ({
    ...m,
    senderName: userCache[m.senderId]?.username || m.senderName || `User ${m.senderId}`,
    senderAvatarUrl: userCache[m.senderId]?.avatarUrl || m.senderAvatarUrl || null,
  }))

  // ── Member management actions ─────────────────────────
  const handleMuteMember = async (member) => {
    try {
      await roomApiService.mute(activeRoomId, member.userId)
      setMembers(prev => prev.map(m => m.userId === member.userId ? { ...m, isMuted: true } : m))
      toast.success(`${member.userId} muted`)
    } catch { toast.error('Failed to mute member') }
  }

  const handleUnmuteMember = async (member) => {
    try {
      await roomApiService.unmute(activeRoomId, member.userId)
      setMembers(prev => prev.map(m => m.userId === member.userId ? { ...m, isMuted: false } : m))
      toast.success('Member unmuted')
    } catch { toast.error('Failed to unmute member') }
  }

  const handleChangeRole = async (member, newRole) => {
    try {
      await roomApiService.updateRole(activeRoomId, member.userId, { role: newRole })
      setMembers(prev => prev.map(m => m.userId === member.userId ? { ...m, role: newRole } : m))
      toast.success(`Role changed to ${newRole}`)
    } catch { toast.error('Failed to change role') }
  }

  const handleSearchAddMember = async (q) => {
    setAddMemberQuery(q)
    if (!q.trim()) { setAddMemberResults([]); return }
    setAddMemberSearching(true)
    try {
      const res = await authApiService.searchUsers(q)
      const existingIds = new Set(members.map(m => m.userId))
      setAddMemberResults((res.data?.data || []).filter(u => !existingIds.has(u.id)))
    } catch { setAddMemberResults([]) }
    finally { setAddMemberSearching(false) }
  }

  const handleAddMember = async (targetUser) => {
    setAddMemberLoading(true)
    try {
      await roomApiService.addMember(activeRoomId, { userId: targetUser.id, role: newMemberRole })
      setMembers(prev => [...prev, { userId: targetUser.id, role: newMemberRole, isMuted: false }])
      setUserCache(c => ({ ...c, [targetUser.id]: targetUser }))
      toast.success(`${targetUser.username} added`)
      setAddMemberOpen(false)
      setAddMemberQuery('')
      setAddMemberResults([])
      setNewMemberRole('MEMBER')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add member') }
    finally { setAddMemberLoading(false) }
  }

  const handleRemoveMember = async (member) => {
    const name = userCache[member.userId]?.username || `User ${member.userId}`
    const confirmed = window.confirm(`Remove ${name} from this room?`)
    if (!confirmed) return

    try {
      await roomApiService.removeMember(activeRoomId, member.userId)
      setMembers(prev => prev.filter(x => x.userId !== member.userId))
      toast.success(`${name} removed`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove member')
    }
  }

  const handleClearRoomHistory = async () => {
    if (!activeRoomId) return
    const confirmed = window.confirm('Clear entire room message history for ALL members? This cannot be undone.')
    if (!confirmed) return

    try {
      await messageApiService.adminDeleteRoomHistory(activeRoomId)
      toast.success('Room history cleared for everyone')
      setPinnedMsgs([])
      clearAllMessages()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to clear room history')
    }
  }

  // ── Clear chat for me only (local) ────────────────────
  const handleClearChatForMe = () => {
    const confirmed = window.confirm('Clear this chat for yourself? Messages will still be visible to other members.')
    if (!confirmed) return
    clearLocalChat()
    toast.success('Chat cleared for you')
  }

  // ── Leave group ────────────────────────────────────────
  const handleLeaveGroup = async () => {
    if (!activeRoomId) return
    const confirmed = window.confirm('Leave this group? You will no longer receive messages from this room.')
    if (!confirmed) return

    try {
      await roomApiService.leave(activeRoomId)
      toast.success('You left the group')
      navigate('/chat')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to leave group')
    }
  }

  // ── Delete group (creator only) ────────────────────────
  const handleDeleteGroup = async () => {
    if (!activeRoomId) return
    const confirmed = window.confirm(
      'Delete this group permanently? All members will be removed and all messages will be lost. This cannot be undone.'
    )
    if (!confirmed) return

    try {
      await roomApiService.delete(activeRoomId)
      toast.success('Group deleted')
      navigate('/chat')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete group')
    }
  }

  // ── Open room profile modal ────────────────────────────
  const openRoomProfile = () => {
    setRoomEditForm({
      name: room?.name || '',
      description: room?.description || '',
      avatarUrl: room?.avatarUrl || '',
    })
    setRoomAvatarFile(null)
    setRoomAvatarPreview(room?.avatarUrl || null)
    setRoomProfileOpen(true)
  }

  // ── Handle avatar file selection ───────────────────────
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setRoomAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setRoomAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── Save room profile ──────────────────────────────────
  const handleSaveRoomProfile = async () => {
    if (!activeRoomId || !isAdmin) return
    if (!roomEditForm.name.trim()) { toast.error('Room name is required'); return }
    setRoomEditLoading(true)

    try {
      let avatarUrl = roomEditForm.avatarUrl

      // If a new avatar file was selected, upload it via standalone media endpoint
      if (roomAvatarFile) {
        try {
          const res = await messageApiService.uploadMedia(roomAvatarFile)
          avatarUrl = res.data?.data?.mediaUrl || avatarUrl
        } catch {
          toast.error('Failed to upload avatar, keeping existing one')
        }
      }

      const updateData = {
        name: roomEditForm.name.trim(),
        description: roomEditForm.description.trim(),
        avatarUrl,
      }

      const res = await roomApiService.update(activeRoomId, updateData)
      const updated = res.data?.data
      if (updated) setRoom(updated)
      toast.success('Room updated!')
      setRoomProfileOpen(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update room')
    } finally {
      setRoomEditLoading(false)
    }
  }

  // ── Actions ────────────────────────────────────────────
  const handleAdminDeleteMessage = async (msgId) => {
    try {
      await messageApiService.adminDelete(msgId)
      toast.success('Message deleted by admin')
      // Broadcast admin delete so it disappears instantly for everyone else
      wsService.sendDelete(
        isDirectChat ? null : activeRoomId,
        isDirectChat ? directPeerId : null,
        msgId,
        true
      )
    } catch { toast.error('Failed to delete message (admin)') }
  }

  const handlePinMessage = async (msg) => {
    try {
      if (msg.isPinned) {
        await messageApiService.unpin(msg.id)
        setPinnedMsgs(p => p.filter(x => x.id !== msg.id))
      } else {
        await messageApiService.pin(msg.id)
        setPinnedMsgs(p => [{ ...msg, isPinned: true }, ...p])
      }
    } catch { toast.error('Failed to pin/unpin message') }
  }

  const handleReact = (messageId, emoji) => reactToMessage(messageId, emoji)

  const handleSearchMessages = async () => {
    if (isDirectChat) { toast.error('Search is available in rooms only'); return }
    if (!activeRoomId || !searchQ.trim()) return
    setSearchLoading(true)
    try {
      const res = await messageApiService.search(activeRoomId, searchQ.trim())
      setSearchResults(res.data?.data || [])
    } catch { toast.error('Search failed') }
    finally { setSearchLoading(false) }
  }

  const handleEditSubmit = async () => {
    if (!editText.trim()) return
    await editMessage(editMsg.id, editText.trim())
    setEditMsg(null)
    setEditText('')
  }

  // Typing indicator display
  const typingNames = [...typingUsers]
    .map(id => userCache[id]?.username || '...')
    .join(', ')

  // ── Empty state ────────────────────────────────────────
  if (!roomId && !isDirectChat) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="empty-state-card text-center max-w-lg w-full">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--brand)' }} />
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Select a conversation
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Pick a room or direct message from the sidebar.
          </p>
        </div>
      </div>
    )
  }

  // Peer info for DM header
  const peer = isDirectChat ? userCache[directPeerId] : null
  const peerPresence = directPeerId ? (presenceMap[directPeerId] || {}) : {}
  const peerStatus = peer
    ? (peerPresence.status || 'INVISIBLE')
    : null
  const peerLastSeenAt = peerPresence.lastSeenAt || peer?.lastSeenAt
  const isPeerTyping = isDirectChat && typingUsers.has(Number(directPeerId))
  const isPeerOnline = peerStatus === 'ONLINE'
  const peerPresenceLabel = isPeerTyping
    ? 'Typing…'
    : isPeerOnline
      ? 'Online'
      : peerStatus === 'AWAY'
        ? 'Away'
        : peerStatus === 'DND'
          ? 'Do Not Disturb'
          : 'Offline'

  // Online member count for group header
  const onlineCount = members.filter(m => presenceMap[m.userId]?.status === 'ONLINE').length

  return (
    <div className="flex h-full overflow-hidden">

      {/* ══ Main chat column ══════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 h-full">

        {/* ── Chat header ── */}
        <div
          className="flex items-center justify-between px-3 sm:px-5 py-3 border-b shrink-0"
          style={{
            borderColor: 'var(--border)',
            background: 'linear-gradient(180deg, var(--bg-secondary), color-mix(in srgb, var(--bg-secondary) 84%, var(--brand-light)))',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile back button */}
            <button
              onClick={() => navigate('/chat')}
              className="lg:hidden p-1 -ml-1 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Back to chats"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Avatar / icon */}
            {isDirectChat ? (
              <button
                onClick={() => setPeerProfileOpen(true)}
                className="shrink-0 cursor-pointer border-none bg-transparent p-0 transition-transform hover:scale-105"
                title="User profile"
              >
                <div className="relative">
                  <Avatar user={peer} size={36} />
                  {/* Presence dot */}
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      background: STATUS_DOT_COLOR[peerStatus] || STATUS_DOT_COLOR.INVISIBLE,
                      borderColor: 'var(--bg-secondary)',
                    }}
                  />
                </div>
              </button>
            ) : (
              <button
                onClick={openRoomProfile}
                className="shrink-0 cursor-pointer border-none bg-transparent p-0 transition-transform hover:scale-105"
                title="Room info"
              >
                {room?.avatarUrl ? (
                  <img
                    src={room.avatarUrl}
                    alt={room.name}
                    className="w-9 h-9 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-light), rgba(124,58,237,0.16))',
                      color: 'var(--brand)',
                    }}
                  >
                    {room?.name?.charAt(0)?.toUpperCase() || <Hash size={16} />}
                  </div>
                )}
              </button>
            )}

            {/* Name + sub-title */}
            <div>
              <h2
                className={`font-semibold text-sm cursor-pointer hover:underline`}
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
                onClick={isDirectChat ? () => setPeerProfileOpen(true) : openRoomProfile}
              >
                {isDirectChat
                  ? (peer?.fullName || peer?.username || `User ${directPeerId}`)
                  : (room?.name || `Room #${roomId}`)}
              </h2>
              <div className="flex flex-col gap-1">
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  {isDirectChat ? (
                    <>
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: STATUS_DOT_COLOR[peerStatus] || STATUS_DOT_COLOR.INVISIBLE }}
                      />
                      {peerPresenceLabel}
                      {peerLastSeenAt && !isPeerOnline && !isPeerTyping && (
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          · Last seen {timeAgo(peerLastSeenAt)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Users size={11} />
                      {members.length} members
                      {onlineCount > 0 && (
                        <span style={{ color: 'var(--success)' }}>· {onlineCount} online</span>
                      )}
                      {room?.description && (
                        <span className="hidden sm:inline"> · {room.description}</span>
                      )}
                    </>
                  )}
                </p>
                {isPeerTyping && (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--success)' }}>
                    Typing…
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setThemeSelectorOpen(true)}
              className="p-2 rounded-xl transition-colors hover:opacity-70"
              style={{ color: 'var(--brand)', background: 'var(--brand-light)' }}
              title="Change Theme"
            >
              <Palette size={16} />
            </button>
            {!isDirectChat && (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-xl transition-colors hover:opacity-70"
                style={{ color: 'var(--brand)', background: 'var(--brand-light)' }}
                title="Search messages"
              >
                <Search size={16} />
              </button>
            )}
            {/* Members panel toggle — only for group rooms */}
            {!isDirectChat && (
              <button
                onClick={() => setMemberPanelOpen(o => !o)}
                className="p-2 rounded-xl transition-colors hover:opacity-70"
                style={{
                  color: memberPanelOpen ? '#fff' : 'var(--success)',
                  background: memberPanelOpen ? 'var(--success)' : 'rgba(16,185,129,0.10)',
                }}
                title="Toggle members"
              >
                <Users size={16} />
              </button>
            )}
            {!isDirectChat && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-xl transition-colors hover:opacity-70"
                style={{ color: 'var(--warning)', background: 'rgba(245,158,11,0.10)' }}
                title="Room options"
              >
                <MoreVertical size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Pinned message banner ── */}
        {pinnedMsgs.length > 0 && (
          <div
            className="flex items-center gap-3 px-5 py-2 border-b text-xs shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
          >
            <Pin size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <p className="truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Pinned: </span>
              {pinnedMsgs[0].content}
            </p>
            <span style={{ color: 'var(--text-muted)' }}>{pinnedMsgs.length} pinned</span>
          </div>
        )}

        {/* ── Messages ── */}
        <div
          className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 chat-surface"
          onScroll={handleScroll}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            background: (PAGE_BACKGROUNDS.find(t => t.id === activeBgTheme) || PAGE_BACKGROUNDS[0]).id !== 'default' 
              ? (PAGE_BACKGROUNDS.find(t => t.id === activeBgTheme) || PAGE_BACKGROUNDS[0]).style 
              : undefined
          }}
        >
          {hasMore && (
            <div className="flex justify-center py-3">
              {loading
                ? <Spinner size={20} />
                : (
                  <button onClick={loadMore} className="text-xs hover:underline" style={{ color: 'var(--brand)' }}>
                    Load older messages
                  </button>
                )}
            </div>
          )}

          {loading && messages.length === 0 && (
            <div className="flex justify-center py-16">
              <Spinner size={32} />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--accent-soft))' }}
              >
                {isDirectChat
                  ? <MessageCircle size={28} style={{ color: 'var(--brand)' }} />
                  : <Hash size={28} style={{ color: 'var(--brand)' }} />
                }
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Be the first to say hello!</p>
            </div>
          )}

          {enrichedMessages.map((msg, idx) => {
            const prevMsg     = enrichedMessages[idx - 1]
            const showAvatar  = !prevMsg || prevMsg.senderId !== msg.senderId
            const isPinned    = pinnedMsgs.some(p => p.id === msg.id)
            const msgSenderIsAdmin = !isDirectChat && members.find(m => String(m.userId) === String(msg.senderId))?.role === 'ADMIN'

            return (
              <MessageBubble
                key={msg.id || idx}
                message={{ ...msg, isPinned }}
                showAvatar={showAvatar}
                onReact={handleReact}
                onEdit={(m) => { setEditMsg(m); setEditText(m.content) }}
                onDelete={deleteMessage}
                onDeleteForMe={deleteLocalMessage}
                onAdminDelete={handleAdminDeleteMessage}
                onReply={setReplyTo}
                onPin={handlePinMessage}
                canPin={!isDirectChat && isAdmin}
                canAdminDelete={!isDirectChat && isAdmin}
                isSenderAdmin={msgSenderIsAdmin}
                onImageClick={setFullScreenImage}
                themeConfig={CHAT_THEMES.find(t => t.id === activeMsgTheme) || CHAT_THEMES[0]}
              />
            )
          })}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-2 py-1 pl-2 animate-fade-in">
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'var(--text-muted)',
                      animation: `bounceDots 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {typingNames} {typingUsers.size === 1 ? 'is' : 'are'} typing…
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Message input ── */}
        <MessageInput
          roomId={activeRoomId}
          recipientId={isDirectChat ? directPeerId : null}
          onSend={sendMessage}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={!isDirectChat && amIMuted}
        />
      </div>

      {/* ══ Members panel (right side) ════════════════════
          Shown only for group rooms when memberPanelOpen=true.
          WhatsApp-style: visible alongside the chat, not modal.
          ════════════════════════════════════════════════ */}
      {!isDirectChat && memberPanelOpen && (
        <>
          {/* Mobile backdrop */}
          <button
            className="lg:hidden absolute inset-0 z-[40]"
            style={{ background: 'rgba(0,0,0,0.38)' }}
            onClick={() => setMemberPanelOpen(false)}
            aria-label="Close members panel"
          />
          <aside
            className="w-64 sm:w-72 flex flex-col border-l overflow-hidden absolute right-0 inset-y-0 z-[50] lg:static lg:z-auto shrink-0 shadow-2xl lg:shadow-none animate-slide-left"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Members ({members.length})
            </span>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={() => setAddMemberOpen(true)}
                  className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--success)' }}
                  title="Add member"
                >
                  <UserPlus size={14} />
                </button>
              )}
              <button
                onClick={() => setMemberPanelOpen(false)}
                className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Member list — sorted online first */}
          <div className="flex-1 overflow-y-auto py-2">
            {/* Online section */}
            {members.filter(m => presenceMap[m.userId]?.status === 'ONLINE').length > 0 && (
              <>
                <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Online — {members.filter(m => presenceMap[m.userId]?.status === 'ONLINE').length}
                </p>
                {members
                  .filter(m => presenceMap[m.userId]?.status === 'ONLINE')
                  .map(m => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      userInfo={userCache[m.userId]}
                      status="ONLINE"
                      isMe={m.userId === user?.id}
                      isAdmin={isAdmin}
                      onDm={() => navigate(`/chat/dm/${m.userId}`)}
                      onKick={() => handleRemoveMember(m)}
                      onMute={() => handleMuteMember(m)}
                      onUnmute={() => handleUnmuteMember(m)}
                      onChangeRole={(role) => handleChangeRole(m, role)}
                    />
                  ))}
              </>
            )}

            {/* Offline / away section */}
            {members.filter(m => presenceMap[m.userId]?.status !== 'ONLINE').length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Offline — {members.filter(m => presenceMap[m.userId]?.status !== 'ONLINE').length}
                </p>
                {members
                  .filter(m => presenceMap[m.userId]?.status !== 'ONLINE')
                  .map(m => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      userInfo={userCache[m.userId]}
                      status={presenceMap[m.userId]?.status || 'INVISIBLE'}
                      isMe={m.userId === user?.id}
                      isAdmin={isAdmin}
                      onDm={() => navigate(`/chat/dm/${m.userId}`)}
                      onKick={() => handleRemoveMember(m)}
                      onMute={() => handleMuteMember(m)}
                      onUnmute={() => handleUnmuteMember(m)}
                      onChangeRole={(role) => handleChangeRole(m, role)}
                    />
                  ))}
              </>
            )}
          </div>
        </aside>
        </>
      )}

      {/* ══ Modals ═══════════════════════════════════════ */}

      {/* Edit message */}
      <Modal open={!!editMsg} onClose={() => setEditMsg(null)} title="Edit Message">
        <div className="space-y-4">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            className="input-base resize-none"
            rows={3}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleEditSubmit())}
          />
          <div className="flex gap-3">
            <button onClick={() => setEditMsg(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleEditSubmit} className="btn-primary flex-1">Save</button>
          </div>
        </div>
      </Modal>

      {/* Room settings */}
      <Modal open={!isDirectChat && settingsOpen} onClose={() => setSettingsOpen(false)} title="Room Options">
        <div className="space-y-3">

          {/* ── Invite Code (Admin only) ── */}
          {isAdmin && room?.inviteCode && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Invite Code</p>
              <div className="flex gap-2">
                <input value={room.inviteCode} readOnly className="input-base flex-1" />
                <Button onClick={async () => {
                  const res = await roomApiService.regenerateInvite(activeRoomId)
                  setRoom(r => ({ ...r, inviteCode: res.data.data.inviteCode }))
                }}>
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* ── Clear chat for me ── */}
          <button
            onClick={() => { handleClearChatForMe(); setSettingsOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}
          >
            <Eraser size={16} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Clear chat</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Clears messages for you only, not for other members</p>
            </div>
          </button>

          {/* ── Leave group ── */}
          <button
            onClick={() => { handleLeaveGroup(); setSettingsOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-80"
            style={{ background: 'rgba(239,68,68,0.06)', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={16} style={{ color: 'var(--danger)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Leave group</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>You won't receive messages from this group anymore</p>
            </div>
          </button>

          {/* ── Admin: Clear room history for everyone ── */}
          {isAdmin && (
            <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Admin</p>
              <button
                onClick={() => { handleClearRoomHistory(); setSettingsOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.06)', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Clear room history</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Deletes all messages for everyone. Cannot be undone.</p>
                </div>
              </button>
            </div>
          )}

          {/* ── Creator: Delete group ── */}
          {room?.createdById === user?.id && (
            <div className={isAdmin ? '' : 'pt-2'} style={!isAdmin ? { borderTop: '1px solid var(--border)' } : {}}>
              <button
                onClick={() => { handleDeleteGroup(); setSettingsOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.10)', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={16} style={{ color: '#dc2626' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#dc2626' }}>Delete group</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Permanently delete this group and all its data</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={addMemberOpen} onClose={() => { setAddMemberOpen(false); setAddMemberQuery(''); setAddMemberResults([]); setNewMemberRole('MEMBER') }} title="Add Member">
        <div className="space-y-3">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Role</p>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="input-base w-full"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Input
            placeholder="Search by username…"
            value={addMemberQuery}
            onChange={e => handleSearchAddMember(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto space-y-1">
            {addMemberSearching && <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>Searching…</p>}
            {!addMemberSearching && addMemberQuery && addMemberResults.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>No users found</p>
            )}
            {addMemberResults.map(u => (
              <button
                key={u.id}
                onClick={() => handleAddMember(u)}
                disabled={addMemberLoading}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left"
                style={{ background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,var(--brand),var(--sea))' }}
                >
                  {(u.username||'?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.fullName||u.username}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                </div>
                <UserPlus size={14} className="ml-auto shrink-0" style={{ color: 'var(--success)' }} />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Search messages */}
      <Modal open={!isDirectChat && searchOpen} onClose={() => setSearchOpen(false)} title="Search Messages">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search in this room…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchMessages()}
            />
            <Button onClick={handleSearchMessages} disabled={!searchQ.trim() || searchLoading}>
              {searchLoading ? 'Searching…' : 'Search'}
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {searchResults.map(item => (
              <button
                key={item.id}
                className="w-full text-left p-3 rounded-xl border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
                onClick={() => { setSearchOpen(false); setSearchQ('') }}
              >
                <p className="text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>{item.content}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {item.senderName || `User ${item.senderId}`}
                </p>
              </button>
            ))}
            {!searchLoading && searchQ.trim() && searchResults.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No messages found.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Room Profile / Edit Modal */}
      <Modal
        open={!isDirectChat && roomProfileOpen}
        onClose={() => setRoomProfileOpen(false)}
        title={isAdmin ? 'Edit Room Profile' : 'Room Info'}
      >
        <div className="space-y-4">

          {/* Avatar section */}
          <div className="flex flex-col items-center">
            <div
              className="relative group cursor-pointer"
              onClick={isAdmin ? () => roomAvatarInputRef.current?.click() : undefined}
            >
              {roomAvatarPreview ? (
                <img
                  src={roomAvatarPreview}
                  alt="Room avatar"
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand), var(--sea))',
                    color: '#fff',
                  }}
                >
                  {room?.name?.charAt(0)?.toUpperCase() || '#'}
                </div>
              )}
              {isAdmin && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <Camera size={24} style={{ color: '#fff' }} />
                </div>
              )}
            </div>
            {isAdmin && (
              <>
                <input
                  ref={roomAvatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  Click to change group photo
                </p>
              </>
            )}
          </div>

          {/* Name */}
          {isAdmin ? (
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Group Name
              </label>
              <input
                value={roomEditForm.name}
                onChange={e => setRoomEditForm(f => ({ ...f, name: e.target.value }))}
                className="input-base w-full"
                placeholder="Enter group name"
                maxLength={100}
              />
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {room?.name}
              </h3>
            </div>
          )}

          {/* Description */}
          {isAdmin ? (
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Description
              </label>
              <textarea
                value={roomEditForm.description}
                onChange={e => setRoomEditForm(f => ({ ...f, description: e.target.value }))}
                className="input-base w-full resize-none"
                placeholder="What's this group about?"
                rows={3}
                maxLength={300}
              />
              <p className="text-[10px] text-right mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {roomEditForm.description.length}/300
              </p>
            </div>
          ) : (
            room?.description && (
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                {room.description}
              </p>
            )
          )}

          {/* Info row for non-admins */}
          {!isAdmin && (
            <div
              className="flex items-center justify-center gap-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{members.length}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Members</p>
              </div>
              <div
                className="w-px h-8"
                style={{ background: 'var(--border)' }}
              />
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--success)' }}>
                  {members.filter(m => presenceMap[m.userId]?.status === 'ONLINE').length}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Online</p>
              </div>
              {room?.createdAt && (
                <>
                  <div className="w-px h-8" style={{ background: 'var(--border)' }} />
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Created</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Save / Cancel buttons (admin only) */}
          {isAdmin && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRoomProfileOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoomProfile}
                disabled={roomEditLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {roomEditLoading ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Edit3 size={14} />
                )}
                {roomEditLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* DM Peer Profile Modal */}
      <Modal
        open={isDirectChat && peerProfileOpen}
        onClose={() => setPeerProfileOpen(false)}
        title="User Profile"
      >
        <div className="space-y-4 flex flex-col items-center py-4">
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => {
              const imgUrl = peer?.avatarUrl || peer?.profileImageUrl
              if (imgUrl) {
                setFullScreenImage(imgUrl)
              } else {
                toast('No profile picture available', { icon: 'ℹ️' })
              }
            }}
          >
            <Avatar user={peer} size={112} className="shadow-lg" />
            {!(peer?.avatarUrl || peer?.profileImageUrl) && (
               <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                 No profile picture
               </p>
            )}
          </div>
          <div className="text-center pt-2">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {peer?.fullName || peer?.username || `User ${directPeerId}`}
            </h3>
            {peer?.username && (
              <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                @{peer.username}
              </p>
            )}
            <p className="text-xs mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
               <span
                 className="inline-block w-2.5 h-2.5 rounded-full shadow-sm"
                 style={{ background: STATUS_DOT_COLOR[peerStatus] || STATUS_DOT_COLOR.INVISIBLE }}
               />
               <span className="font-medium tracking-wide uppercase text-[10px]">{peerPresenceLabel}</span>
            </p>
          </div>

          <div className="w-full pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => { setPeerProfileOpen(false); setThemeSelectorOpen(true); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
                  <Palette size={18} />
                </div>
                <span className="font-medium text-sm">Chat Theme</span>
              </div>
              <div className="w-6 h-6 rounded-full shadow-sm" style={{ background: (CHAT_THEMES.find(t => t.id === activeTheme) || CHAT_THEMES[0]).gradient }} />
            </button>
          </div>
        </div>
      </Modal>

      {/* Theme Selector Modal */}
      <Modal
        open={themeSelectorOpen}
        onClose={() => setThemeSelectorOpen(false)}
        title="Customize Chat"
      >
        <div className="flex gap-2 mb-4 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
          <button 
            onClick={() => setCustomizingType('message')} 
            className={`flex-1 pb-1 font-semibold text-sm border-b-2 transition-colors ${customizingType === 'message' ? 'text-brand border-brand' : 'text-muted border-transparent hover:text-primary'}`}
            style={customizingType === 'message' ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : { color: 'var(--text-muted)' }}
          >
            Message Bubbles
          </button>
          <button 
            onClick={() => setCustomizingType('background')} 
            className={`flex-1 pb-1 font-semibold text-sm border-b-2 transition-colors ${customizingType === 'background' ? 'text-brand border-brand' : 'text-muted border-transparent hover:text-primary'}`}
            style={customizingType === 'background' ? { color: 'var(--brand)', borderColor: 'var(--brand)' } : { color: 'var(--text-muted)' }}
          >
            Chat Background
          </button>
        </div>

        {customizingType === 'message' ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            {CHAT_THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => handleMsgThemeChange(t.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border-2"
                style={{ 
                  borderColor: activeMsgTheme === t.id ? 'var(--brand)' : 'var(--border)',
                  background: activeMsgTheme === t.id ? 'var(--bg-hover)' : 'var(--bg-tertiary)'
                }}
              >
                <div 
                  className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center animate-gradient"
                  style={{ background: t.gradient, backgroundSize: '200% 200%' }}
                >
                  {activeMsgTheme === t.id && <CheckCircle2 size={24} color="#fff" />}
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2">
            {PAGE_BACKGROUNDS.map(t => (
              <button
                key={t.id}
                onClick={() => handleBgThemeChange(t.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border-2"
                style={{ 
                  borderColor: activeBgTheme === t.id ? 'var(--brand)' : 'var(--border)',
                  background: activeBgTheme === t.id ? 'var(--bg-hover)' : 'var(--bg-tertiary)'
                }}
              >
                <div 
                  className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center border"
                  style={{ background: t.id === 'default' ? 'var(--bg-secondary)' : t.style, borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  {activeBgTheme === t.id && <CheckCircle2 size={24} color="#fff" />}
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out p-4 animate-in fade-in duration-200"
          onClick={() => setFullScreenImage(null)}
        >
           <button 
             className="absolute top-4 right-4 p-2.5 text-white hover:bg-white/20 bg-black/50 rounded-full backdrop-blur-md transition-colors"
             onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
           >
             <X size={24} />
           </button>
           <img 
             src={fullScreenImage} 
             alt="Full screen profile" 
             className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
             onClick={(e) => e.stopPropagation()}
           />
        </div>
      )}
    </div>
  )
}

// ── Member row component ──────────────────────────────────────
function MemberRow({ member, userInfo, status, isMe, isAdmin, onDm, onKick, onMute, onUnmute, onChangeRole }) {
  const name = userInfo?.username || userInfo?.fullName || `User ${member.userId}`
  const isMuted = member.isMuted
  const isRoomAdmin = member.role === 'ADMIN'

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 hover:opacity-80 transition-opacity group"
      style={{ cursor: 'default' }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar user={userInfo || { username: name }} size={32} />
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
          style={{
            background: STATUS_DOT_COLOR[status] || STATUS_DOT_COLOR.INVISIBLE,
            borderColor: 'var(--bg-secondary)',
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {name}{isMe ? ' (you)' : ''}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {member.role}{isMuted ? ' · 🔇 Muted' : ''} · {STATUS_LABELS[status] || 'Offline'}
        </p>
      </div>

      {/* Actions — appear on hover */}
      {!isMe && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onDm}
            className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--brand)' }}
            title={`DM ${name}`}
          >
            <MessageCircle size={12} />
          </button>
          {isAdmin && (
            <>
              {/* Mute / Unmute */}
              <button
                onClick={isMuted ? onUnmute : onMute}
                className="p-1 rounded hover:opacity-70"
                style={{ color: isMuted ? 'var(--success)' : 'var(--warning)' }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <Volume2 size={12} /> : <VolumeX size={12} />}
              </button>
              {/* Promote / Demote */}
              <button
                onClick={() => onChangeRole(isRoomAdmin ? 'MEMBER' : 'ADMIN')}
                className="p-1 rounded hover:opacity-70"
                style={{ color: isRoomAdmin ? 'var(--text-muted)' : 'var(--blue,#56B6C6)' }}
                title={isRoomAdmin ? 'Demote to Member' : 'Promote to Admin'}
              >
                {isRoomAdmin ? <ShieldOff size={12} /> : <Shield size={12} />}
              </button>
              {/* Kick */}
              <button
                onClick={onKick}
                className="p-1 rounded hover:opacity-70"
                style={{ color: 'var(--danger)' }}
                title={`Remove ${name}`}
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Re-export so router can still import it (no changes needed in App.jsx)
const STATUS_DOT_COLOR_EXPORT = STATUS_DOT_COLOR
