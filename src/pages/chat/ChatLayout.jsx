import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Hash, MessageCircle, Lock, UserPlus,
  Search, Users, X, ChevronDown, Settings, Edit,
  Sun, Moon, LogOut, Shield, Star
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { roomApiService } from '../../api/roomApi'
import { authApiService } from '../../api/authApi'
import { presenceApiService } from '../../api/presenceApi'
import { messageApiService } from '../../api/messageApi'
import { wsService } from '../../api/wsService'
import Avatar from '../../components/ui/Avatar'
import NotificationBell from '../../components/ui/NotificationBell'
import { Modal, Input, Button } from '../../components/ui'
import { useAuthStore } from '../../context/authStore'
import { useSubscriptionStore } from '../../context/subscriptionStore'
import { formatRelativeTime, STATUS_COLORS, STATUS_LABELS, getAvatarGradient, timeAgo } from '../../utils/helpers'
import toast from 'react-hot-toast'


// ─────────────────────────────────────────────────────────────

const TABS = ['All', 'Rooms', 'DMs']

export default function ChatLayout() {
  const navigate = useNavigate()
  const { roomId, userId } = useParams()
  const { user } = useAuthStore()
  const { isProUser } = useSubscriptionStore()

  const [activeTab, setActiveTab] = useState('All')
  const [rooms, setRooms] = useState([])
  const [dmContacts, setDmContacts] = useState([])   // { user, lastMsg, unread }
  const [presenceMap, setPresenceMap] = useState({})
  const [searchQ, setSearchQ] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [newDmOpen, setNewDmOpen] = useState(false)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)

  const { theme, toggle: toggleTheme } = useTheme()

  const hasActiveChat = Boolean(roomId || userId)

  // Presence refresh interval
  const presenceTimer = useRef(null)

  const mergeDmContacts = useCallback((contacts) => {
    setDmContacts(prev => {
      const map = new Map(prev.map(item => [String(item.user.id), item]))
      contacts.forEach(item => {
        const key = String(item.user.id)
        const existing = map.get(key)
        map.set(key, existing
          ? { ...existing, user: item.user }
          : item)
      })
      return Array.from(map.values())
    })
  }, [])
  const formatPreview = (message) => {
    if (!message) return ''
    if (message.content && String(message.content).trim()) {
      const text = String(message.content).trim()
      return text.length > 40 ? `${text.slice(0, 40)}...` : text
    }
    if (message.type === 'IMAGE' || message.imageUrl || message.mediaUrl) return '📷 Photo'
    if (message.type === 'FILE' || message.fileUrl) return '📎 File'
    if (message.type === 'VIDEO') return '🎥 Video'
    return 'Attachment'
  }

  const loadDmMessagePreviews = useCallback(async (ids) => {
    if (!ids?.length) return
    try {
      const results = await Promise.allSettled(
        ids.map(id => messageApiService.getDirect(id, 0, 1))
      )

      const previewMap = results.reduce((acc, result, index) => {
        if (result.status !== 'fulfilled') return acc
        const payload = result.value?.data?.data
        const messages = payload?.content || payload || []
        const msg = Array.isArray(messages) ? messages[0] : null
        if (msg) acc[ids[index]] = formatPreview(msg)
        return acc
      }, {})

      if (Object.keys(previewMap).length) {
        setDmContacts(prev => prev.map(d => {
          const preview = previewMap[String(d.user.id)]
          if (!preview || d.lastMsg) return d
          return { ...d, lastMsg: preview }
        }))
      }
    } catch {
      // best-effort preview only
    }
  }, [])
  // ── Presence fetch ────────────────────────────────────
  const fetchPresence = useCallback(async (ids) => {
    if (!ids?.length) return
    try {
      const res = await presenceApiService.getBulk(ids)
      const map = (res.data.data || []).reduce((acc, p) => {
        acc[p.userId] = p
        return acc
      }, {})
      setPresenceMap(prev => ({ ...prev, ...map }))
    } catch {
      // presence-service may not be running — dots default to offline
    }
  }, [])

  // ── Build DM contacts from real DM rooms ─────────────
  const hydrateDmContactsFromRooms = useCallback(async (roomList) => {
    if (!user?.id || !Array.isArray(roomList)) return

    const myId = Number(user.id)
    const participantMap = new Map() // peerId -> { lastMessageAt, unreadCount }

    // Collect DM rooms and try to extract peer IDs from the room name
    const dmRoomsWithoutPeer = [] // rooms where name-parse failed
    roomList.forEach(room => {
      const roomName = room?.name || ''
      const looksLikeDm =
        room?.type === 'DM' ||
        room?.isDirect === true ||
        /^DM-\d+-\d+$/i.test(roomName)

      if (!looksLikeDm) return

      // Try name parsing first (fast path)
      const match = roomName.match(/^DM-(\d+)-(\d+)$/i)
      let peerId = null
      if (match) {
        const idA = Number(match[1])
        const idB = Number(match[2])
        if (idA === myId) peerId = idB
        else if (idB === myId) peerId = idA
      }

      if (peerId && Number.isFinite(peerId) && peerId !== myId) {
        participantMap.set(peerId, {
          roomId: room.id,
          lastMessageAt: room.lastMessageAt || room.createdAt,
          unreadCount: room.unreadCount || 0
        })
      } else {
        // Name didn't match pattern — need to fetch members
        dmRoomsWithoutPeer.push(room)
      }
    })

    // Fallback: for DM rooms where name-parse failed, fetch their members
    if (dmRoomsWithoutPeer.length) {
      const memberResults = await Promise.allSettled(
        dmRoomsWithoutPeer.map(r => Promise.all([
          roomApiService.getMembers(r.id),
          Promise.resolve(r) // pass room along
        ]))
      )
      memberResults.forEach(r => {
        if (r.status !== 'fulfilled') return
        const [membersRes, room] = r.value
        const members = membersRes?.data?.data || []
        members.forEach(m => {
          const uid = Number(m.userId)
          if (Number.isFinite(uid) && uid !== myId) {
            participantMap.set(uid, {
              roomId: room.id,
              lastMessageAt: room.lastMessageAt || room.createdAt,
              unreadCount: room.unreadCount || 0
            })
          }
        })
      })
    }

    const ids = Array.from(participantMap.keys())
    if (!ids.length) return

    try {
      const results = await Promise.allSettled(
        ids.map(id => authApiService.getProfileById(id))
      )

      const contacts = results
        .map(r => (r.status === 'fulfilled' ? r.value?.data?.data : null))
        .filter(Boolean)
        .map(profile => {
          const roomData = participantMap.get(Number(profile.id)) || {}
          return {
            roomId: roomData.roomId,
            user: profile,
            lastMsg: null,
            unread: roomData.unreadCount || 0,
            lastMessageAt: roomData.lastMessageAt
          }
        })

      if (contacts.length) {
        mergeDmContacts(contacts)
        loadDmMessagePreviews(ids)
      }
      fetchPresence(ids)
    } catch {
      // best-effort only
    }
  }, [user?.id, mergeDmContacts, fetchPresence, loadDmMessagePreviews])

  // ── Load rooms ─────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const res = await roomApiService.getMyRooms()
      const data = res.data.data || []
      setRooms(data)

      // Build DM sidebar from actual DM rooms the user is part of.
      await hydrateDmContactsFromRooms(data)

      // Fetch presence for all room members asynchronously
      const memberIds = [...new Set(data.flatMap(r => r.memberIds || []))]
      if (memberIds.length) fetchPresence(memberIds)
    } catch {
      // room-service may not be running in dev — fail silently
    } finally {
      setLoadingRooms(false)
    }
  }, [fetchPresence, hydrateDmContactsFromRooms])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  // ── Clear unread counts and update API when viewing chat ────────
  useEffect(() => {
    if (userId) {
      setDmContacts(prev => prev.map(d => {
        if (String(d.user.id) === String(userId)) {
          if (d.unread > 0 && d.roomId) {
            roomApiService.updateLastRead(d.roomId, { readAt: new Date().toISOString() }).catch(() => {})
          }
          return { ...d, unread: 0 }
        }
        return d
      }))
    }
    if (roomId) {
      setRooms(prev => prev.map(r => {
        if (String(r.id) === String(roomId)) {
          if (r.unreadCount > 0) {
            roomApiService.updateLastRead(r.id, { readAt: new Date().toISOString() }).catch(() => {})
          }
          return { ...r, unreadCount: 0 }
        }
        return r
      }))
    }
  }, [roomId, userId])

  useEffect(() => {
    // Refresh presence every 30 seconds as a fallback
    presenceTimer.current = setInterval(() => {
      const allIds = [
        ...rooms.flatMap(r => r.memberIds || []),
        ...dmContacts.map(d => d.user.id),
      ]
      if (allIds.length) fetchPresence([...new Set(allIds)])
    }, 30000)
    return () => clearInterval(presenceTimer.current)
  }, [rooms, dmContacts, fetchPresence])

  // ── Real-time presence via WebSocket ──────────────────
  // Handles PRESENCE_UPDATE events broadcast to /topic/presence
  // whenever any user connects, disconnects, or changes status.
  // Also re-fetches via HTTP once the WS handshake completes so
  // we don't show everyone as INVISIBLE due to a timing race.
  useEffect(() => {
    const handlePresenceEvent = (frame) => {
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

    wsService.subscribeToPresence(handlePresenceEvent)

    // Re-fetch bulk presence once WS is connected so we catch users
    // who were already online before our subscription was ready.
    const detachOnConnect = wsService.onConnect(() => {
      const allIds = [
        ...rooms.flatMap(r => r.memberIds || []),
        ...dmContacts.map(d => d.user.id),
      ]
      if (allIds.length) fetchPresence([...new Set(allIds)])
    })

    // If WS is already connected right now, fetch immediately too
    if (wsService.isConnected()) {
      const allIds = [
        ...rooms.flatMap(r => r.memberIds || []),
        ...dmContacts.map(d => d.user.id),
      ]
      if (allIds.length) fetchPresence([...new Set(allIds)])
    }

    return () => {
      wsService.unsubscribeFromPresence(handlePresenceEvent)
      detachOnConnect()
    }
  }, [rooms, dmContacts, fetchPresence])

  // ── Subscribe to personal queue for unread badge updates ─
  useEffect(() => {
    if (!user?.id) return
    const myId = Number(user.id)
    const handlePersonal = async (frame) => {
      // Handle presence updates sent to our personal topic (catch-up events)
      if (frame.type === 'PRESENCE_UPDATE' && frame.userId) {
        setPresenceMap(prev => ({
          ...prev,
          [frame.userId]: {
            ...(prev[frame.userId] || {}),
            userId: frame.userId,
            status: frame.status || 'INVISIBLE',
            lastSeenAt: frame.status === 'ONLINE'
              ? null
              : (frame.lastSeenAt ?? prev[frame.userId]?.lastSeenAt),
          },
        }))
        return
      }

      if (frame.type !== 'CHAT_MESSAGE') return

      // ── Room message ──
      if (frame.roomId) {
        const activeId = roomId
        if (String(frame.roomId) !== String(activeId)) {
          setRooms(prev => prev.map(r =>
            String(r.id) === String(frame.roomId)
              ? { ...r, unreadCount: (r.unreadCount || 0) + 1, lastMessageAt: frame.sentAt }
              : r
          ))
        }
        return
      }

      // ── Direct message ──
      const senderId = Number(frame.senderId)
      const recipientId = Number(frame.recipientId)
      const peerId = senderId === myId ? recipientId : senderId
      if (!Number.isFinite(peerId) || peerId === myId) return

      // Check if this DM peer already exists in the sidebar
      const alreadyExists = dmContacts.some(d => Number(d.user.id) === peerId)
      if (!alreadyExists) {
        // Fetch the peer profile and add them
        try {
          const res = await authApiService.getProfileById(peerId)
          const profile = res.data?.data
          if (profile) {
            setDmContacts(prev => {
              if (prev.some(d => Number(d.user.id) === peerId)) return prev
              return [{
                user: profile,
                lastMsg: frame.content,
                unread: senderId !== myId ? 1 : 0,
                lastMessageAt: frame.sentAt || new Date().toISOString()
              }, ...prev]
            })
          }
        } catch { /* best-effort */ }
      } else {
        // Update existing contact's last message and unread count
        const isActive = String(peerId) === String(userId)
        setDmContacts(prev => prev.map(d =>
          Number(d.user.id) === peerId
            ? {
              ...d,
              lastMsg: frame.content || d.lastMsg,
              unread: (!isActive && senderId !== myId) ? (d.unread || 0) + 1 : d.unread,
              lastMessageAt: frame.sentAt || new Date().toISOString()
            }
            : d
        ))
      }
    }
    wsService.subscribeToUser(user.id, handlePersonal)
    return () => wsService.unsubscribeFromUser(user.id, handlePersonal)
  }, [user?.id, roomId, userId, dmContacts])

  // ── Filter ────────────────────────────────────────────
  const q = searchQ.toLowerCase()

  const filteredRooms = rooms.filter(r => {
    if (activeTab === 'DMs') return false
    // Always hide DM rooms from the rooms list — they show as contacts in DMs section
    if (r.type === 'DM' || /^DM-\d+-\d+$/i.test(r.name || '')) return false
    if (q) return r.name?.toLowerCase().includes(q)
    return true
  }).sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0))

  const filteredDms = dmContacts.filter(d => {
    if (activeTab === 'Rooms') return false
    // Don't show self as a DM contact
    if (user?.id && String(d.user.id) === String(user.id)) return false
    if (q) return d.user.username?.toLowerCase().includes(q) ||
      d.user.fullName?.toLowerCase().includes(q)
    return true
  }).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))

  // ── Status helpers ────────────────────────────────────
  const getStatus = (userId) => presenceMap[userId]?.status || 'INVISIBLE'

  return (
    <div className="flex h-full w-full relative overflow-hidden">

      {/* ══════════════════════════════════════════════════
          SIDEBAR — unified contacts panel
          ══════════════════════════════════════════════════ */}
      <aside
        className={`mobile-chat-bg page-shell border-r shrink-0 z-[75] transition-all duration-200
          ${!hasActiveChat ? 'flex flex-col w-full' : 'hidden'}
          lg:flex lg:flex-col lg:w-80 xl:w-96 lg:static
        `}
        style={{ borderColor: 'var(--border)', height: '100%' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <span
            className="font-bold text-base tracking-tight flex items-center gap-1"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            <span>Connect<span style={{ color: 'var(--brand)' }}>Hub</span></span>
            {isProUser && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase ml-1" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', letterSpacing: '0.05em' }}>PRO</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <button
              onClick={() => setNewDmOpen(true)}
              className="p-2 rounded-xl transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
              title="New direct message"
            >
              <MessageCircle size={18} />
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              className="p-2 rounded-xl transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
              title="Join room by invite"
            >
              <UserPlus size={18} />
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="p-2 rounded-xl transition-colors hover:opacity-70 shadow-sm hover:shadow-md"
              style={{ color: 'var(--brand)', background: 'var(--brand-light)' }}
              title="Create new room"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => {
                setMobileSettingsOpen(false)
                navigate('/profile')
              }}
              className="md:hidden w-8 h-8 rounded-full overflow-hidden transition-transform hover:scale-105"
              style={{ 
                border: isProUser ? '2px solid transparent' : '2px solid var(--border)', 
                background: isProUser ? 'linear-gradient(var(--bg-tertiary), var(--bg-tertiary)) padding-box, linear-gradient(135deg, #6366f1, #a855f7) border-box' : 'var(--bg-tertiary)' 
              }}
              title="Profile"
              aria-label="Open profile"
            >
              <Avatar user={user} size={28} />
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search rooms & people…"
              className="flex-1 bg-transparent border-none outline-none text-xs"
              style={{ color: 'var(--text-primary)' }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} style={{ color: 'var(--text-muted)' }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs (Desktop Only) ── */}
        <div
          className="hidden sm:flex shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all relative"
              style={{
                color: activeTab === tab ? 'var(--brand)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tab}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: 'var(--brand)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* Loading skeleton */}
          {loadingRooms && (
            <div className="space-y-1 px-2 pt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          )}

          {/* ── Rooms section ── */}
          {!loadingRooms && filteredRooms.length > 0 && (
            <>
              {activeTab === 'All' && (
                <SectionLabel label="Rooms" />
              )}
              {filteredRooms.map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  active={String(room.id) === String(roomId)}
                  presenceMap={presenceMap}
                  onNavigate={() => {
                    setRooms(prev => prev.map(r =>
                      r.id === room.id ? { ...r, unreadCount: 0 } : r
                    ))
                    navigate(`/chat/${room.id}`)
                  }}
                />
              ))}
            </>
          )}

          {/* ── DMs section ── */}
          {!loadingRooms && (activeTab === 'All' || activeTab === 'DMs') && filteredDms.length > 0 && (
            <>
              <SectionLabel label="Direct Messages" />
              {filteredDms.map(({ user: contact, lastMsg, unread }) => (
                <DmItem
                  key={contact.id}
                  contact={contact}
                  lastMsg={lastMsg}
                  unread={unread}
                  status={getStatus(contact.id)}
                  lastSeenAt={presenceMap[contact.id]?.lastSeenAt || contact.lastSeenAt}
                  active={String(contact.id) === String(userId)}
                  onNavigate={() => {
                    setDmContacts(prev => prev.map(d =>
                      d.user.id === contact.id ? { ...d, unread: 0 } : d
                    ))
                    navigate(`/chat/dm/${contact.id}`)
                  }}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {!loadingRooms && filteredRooms.length === 0 && filteredDms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                {activeTab === 'DMs' ? (
                  <MessageCircle size={20} style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <Hash size={20} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {searchQ ? 'No results found' : activeTab === 'DMs' ? 'No direct messages' : 'No rooms yet'}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {searchQ
                  ? 'Try a different search term'
                  : activeTab === 'DMs'
                    ? 'Click ✉ above to start a DM'
                    : 'Create a room or join with an invite code'}
              </p>
            </div>
          )}
        </div>

        {/* ── Mobile Floating Action Button (FAB) ── */}
        <div className="md:hidden fixed bottom-[72px] right-4 z-[90]">
          <button
            onClick={() => setNewDmOpen(true)}
            className="fab-btn w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Edit size={24} />
          </button>
        </div>

        {/* ── Mobile Bottom Navigation ── */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 flex border-t justify-around items-center pt-1.5 pb-safe px-2 z-[80]"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          {/* Settings Popover */}
          {mobileSettingsOpen && (
            <>
              {/* backdrop */}
              <button
                className="fixed inset-0 z-[88]"
                onClick={() => setMobileSettingsOpen(false)}
                aria-label="Close menu"
              />
              <div
                className="absolute bottom-[100%] right-2 mb-2 w-52 rounded-2xl shadow-xl border p-2 z-[89] animate-slide-up"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <button
                  onClick={() => { toggleTheme(); setMobileSettingsOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => {
                    setMobileSettingsOpen(false)
                    navigate('/settings')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Shield size={16} />
                  Account Settings
                </button>
                <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                <button
                  onClick={() => {
                    setMobileSettingsOpen(false)
                    useAuthStore.getState().logout()
                    navigate('/login')
                    toast.success('Logged out')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium"
                  style={{ color: 'var(--danger)' }}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}

          {/* Chats */}
          <button
            onClick={() => { setActiveTab('All'); setMobileSettingsOpen(false) }}
            className="flex flex-col items-center gap-1 p-2 flex-1"
            style={{ color: (activeTab === 'All' || activeTab === 'DMs') ? 'var(--brand)' : 'var(--text-muted)' }}
          >
            <MessageCircle size={22} />
            <span className="text-[10px] font-semibold">Chats</span>
          </button>

          {/* Rooms */}
          <button
            onClick={() => { setActiveTab('Rooms'); setMobileSettingsOpen(false) }}
            className="flex flex-col items-center gap-1 p-2 flex-1"
            style={{ color: activeTab === 'Rooms' ? 'var(--brand)' : 'var(--text-muted)' }}
          >
            <Users size={22} />
            <span className="text-[10px] font-semibold">Rooms</span>
          </button>

          {/* Admin Panel (Platform Admin only) */}
          {user?.role === 'PLATFORM_ADMIN' && (
            <button
              onClick={() => {
                setMobileSettingsOpen(false)
                navigate('/admin')
              }}
              className="flex flex-col items-center gap-1 p-2 flex-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <Shield size={22} />
              <span className="text-[10px] font-semibold">Admin</span>
            </button>
          )}

          {/* Subscription */}
          <button
            onClick={() => {
              setMobileSettingsOpen(false)
              navigate('/subscription')
            }}
            className="flex flex-col items-center gap-1 p-2 flex-1 rounded-xl transition-colors"
            style={{ 
              color: isProUser ? '#fff' : '#f59e0b',
              background: isProUser ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))' : 'transparent',
              border: isProUser ? '1px solid rgba(168,85,247,0.2)' : 'none'
            }}
          >
            <Star size={22} style={{ color: isProUser ? '#c084fc' : '#f59e0b' }} />
            <span className="text-[10px] font-semibold" style={{ color: isProUser ? '#c084fc' : '#f59e0b' }}>Pro</span>
          </button>

          {/* Settings â†’ popover */}
          <button
            onClick={() => setMobileSettingsOpen(prev => !prev)}
            className="flex flex-col items-center gap-1 p-2 flex-1"
            style={{ color: mobileSettingsOpen ? 'var(--brand)' : 'var(--text-muted)' }}
          >
            <Settings size={22} />
            <span className="text-[10px] font-semibold">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div
        className={`min-w-0 relative h-full
          ${hasActiveChat ? 'flex flex-1 flex-col w-full' : 'hidden'}
          lg:flex lg:flex-1 lg:flex-col
        `}
      >
        <Outlet />
      </div>

      {/* ── Modals ── */}
      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(room) => {
          setRooms(r => [room, ...r])
          setCreateOpen(false)
          navigate(`/chat/${room.id}`)
        }}
      />

      <JoinRoomModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(room) => {
          setRooms(r => r.find(x => x.id === room.id) ? r : [room, ...r])
          setJoinOpen(false)
          navigate(`/chat/${room.id}`)
        }}
      />

      <NewDmModal
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        currentUserId={user?.id}
        onStart={(targetUser) => {
          // Add to DM contacts if not present
          setDmContacts(prev =>
            prev.find(d => d.user.id === targetUser.id)
              ? prev
              : [{ user: targetUser, lastMsg: null, unread: 0 }, ...prev]
          )
          setNewDmOpen(false)
          navigate(`/chat/dm/${targetUser.id}`)
        }}
      />
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <p
      className="px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-widest"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
    </p>
  )
}

// ── Room list item ────────────────────────────────────────────
function RoomItem({ room, active, presenceMap, onNavigate }) {
  const onlineCount = (room.memberIds || [])
    .filter(id => presenceMap[id]?.status === 'ONLINE').length

  return (
    <button
      onClick={onNavigate}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all mx-1 rounded-2xl ${active ? 'chat-item-active' : ''}`}
      style={{
        width: 'calc(100% - 8px)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Room icon / avatar */}
      {room.avatarUrl ? (
        <img
          src={room.avatarUrl}
          alt={room.name}
          className="w-[52px] h-[52px] rounded-2xl shrink-0 object-cover"
        />
      ) : (
        <div
          className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0 text-[18px] font-bold"
          style={{
            background: active
              ? 'linear-gradient(135deg, var(--brand), var(--sea))'
              : 'var(--bg-tertiary)',
            color: active ? '#fff' : 'var(--text-muted)',
          }}
        >
          {room.isPrivate
            ? <Lock size={20} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />
            : room.name?.charAt(0)?.toUpperCase() || <Hash size={20} />
          }
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p
            className="text-[17px] font-semibold truncate"
            style={{ color: active ? 'var(--brand)' : 'var(--text-primary)' }}
          >
            {room.name}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {room.lastMessageAt && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(room.lastMessageAt)}
              </span>
            )}
            {room.unreadCount > 0 && (
              <span
                className="text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5"
                style={{ background: 'var(--brand)', color: '#fff' }}
              >
                {room.unreadCount > 99 ? '99+' : room.unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {/* Online member count dot */}
          {onlineCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'var(--success)' }}
              />
              <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {onlineCount} online
              </span>
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── DM contact item ───────────────────────────────────────────
function DmItem({ contact, lastMsg, unread, status, lastSeenAt, active, onNavigate }) {
  const statusColors = {
    ONLINE: '#8ACBD0',
    AWAY: '#56B6C6',
    DND: '#170C79',
    INVISIBLE: '#6b7280',
  }

  const isOnline = status === 'ONLINE'
  const subtitle = lastMsg
    ? lastMsg
    : isOnline
      ? 'Online'
      : lastSeenAt
        ? `Last seen ${timeAgo(lastSeenAt)}`
        : (STATUS_LABELS[status] || 'Offline')

  return (
    <button
      onClick={onNavigate}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all mx-1 rounded-2xl ${active ? 'dm-item-active' : ''}`}
      style={{
        width: 'calc(100% - 8px)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Avatar with presence dot */}
      <div className="relative shrink-0">
        <Avatar user={contact} size={52} />
        {/* Presence dot */}
        <span
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-[2.5px]"
          style={{
            background: statusColors[status] || statusColors.INVISIBLE,
            borderColor: 'var(--bg-secondary)',
          }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p
            className="text-[17px] font-semibold truncate"
            style={{ color: active ? 'var(--brand)' : 'var(--text-primary)' }}
          >
            {contact.fullName || contact.username}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {unread > 0 && (
              <span
                className="text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5"
                style={{ background: 'var(--success)', color: '#fff' }}
              >
                {unread}
              </span>
            )}
          </div>
        </div>
        <p className="text-[14px] truncate mt-1" style={{ color: isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
          {subtitle}
        </p>
      </div>
    </button>
  )
}

// ── Create Room Modal ─────────────────────────────────────────
function CreateRoomModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'GROUP', isPrivate: false })
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Room name is required')
    setLoading(true)
    try {
      const res = await roomApiService.create(form)
      toast.success('Room created!')
      onCreated(res.data.data)
      setForm({ name: '', description: '', type: 'GROUP', isPrivate: false })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Room">
      <div className="space-y-4">
        <Input
          label="Room Name"
          placeholder="Engineering, Design, Product…"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          icon={Hash}
        />
        <Input
          label="Description (optional)"
          placeholder="What is this room for?"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Privacy
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: false, label: '🌐 Public', desc: 'Anyone with link can join' },
              { val: true, label: '🔒 Private', desc: 'Invite only' },
            ].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => setForm(f => ({ ...f, isPrivate: opt.val }))}
                className="p-3 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: form.isPrivate === opt.val ? 'var(--brand)' : 'var(--border)',
                  background: form.isPrivate === opt.val ? 'var(--brand-light)' : 'var(--bg-tertiary)',
                }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={handleCreate} loading={loading} icon={Plus}>
          Create Room
        </Button>
      </div>
    </Modal>
  )
}

// ── Join Room Modal ───────────────────────────────────────────
function JoinRoomModal({ open, onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!code.trim()) return toast.error('Invite code is required')
    setLoading(true)
    try {
      const res = await roomApiService.joinByInvite(code.trim())
      toast.success('Joined room!')
      onJoined(res.data.data)
      setCode('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join Room">
      <div className="space-y-4">
        <Input
          label="Invite Code"
          placeholder="ABCD-1234"
          value={code}
          onChange={e => setCode(e.target.value)}
          icon={Lock}
        />
        <Button className="w-full" onClick={handleJoin} loading={loading} icon={UserPlus}>
          Join Room
        </Button>
      </div>
    </Modal>
  )
}

// ── New DM Modal ──────────────────────────────────────────────
function NewDmModal({ open, onClose, currentUserId, onStart }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const doSearch = useCallback(async (q) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await authApiService.searchUsers(q)
      setResults((res.data.data || []).filter(u => u.id !== currentUserId))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [currentUserId])

  const handleClose = () => {
    setQuery('')
    setResults([])
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Direct Message">
      <div className="space-y-3">
        <Input
          placeholder="Search by username…"
          value={query}
          onChange={e => doSearch(e.target.value)}
          icon={Search}
        />

        <div className="max-h-64 overflow-y-auto space-y-1">
          {searching && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              Searching…
            </p>
          )}
          {!searching && query && results.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No users found for "{query}"
            </p>
          )}
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => onStart(u)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{ background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}
            >
              <Avatar user={u} size={36} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {u.fullName || u.username}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  @{u.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
