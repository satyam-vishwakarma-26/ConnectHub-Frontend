import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { messageApiService } from '../api/messageApi'
import { wsService } from '../api/wsService'
import { useAuthStore } from '../context/authStore'
import { chatHistoryManager } from '../utils/chatHistoryManager'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
//  BUG FIX #2 — Stale page state when switching rooms
//
//  Previously: `page` was useState(0). loadMessages used it via
//  closure — but when you called loadMessages(reset=true) after
//  switching rooms, the closure captured the OLD room's page value
//  (e.g. page=3). So room B would try to load page 3 immediately,
//  get an empty array, and show a blank screen.
//
//  Fix: track page in a useRef so loadMessages always reads the
//  current value without stale-closure issues. Reset the ref
//  synchronously when `reset=true` before the API call.
// ─────────────────────────────────────────────────────────────

export function useMessages({ roomId = null, otherUserId = null } = {}) {
  const { user } = useAuthStore()
  const [messages, setMessages]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [hasMore, setHasMore]         = useState(true)
  const [typingUsers, setTypingUsers] = useState(new Set())

  // BUG FIX #2: use a ref for page so loadMessages never captures stale value
  const pageRef      = useRef(0)
  const loadingRef   = useRef(false)   // prevents duplicate in-flight requests
  const typingTimers = useRef({})
  const PAGE_SIZE    = 30
  const isDirect     = !!otherUserId

  const normalizeServerMessage = useCallback((m) => ({
    ...(m || {}),
    reactions: m?.reactions || {},
    myReactions: m?.myReactions || [],
  }), [])

  // ── Load messages ─────────────────────────────────────
  const loadMessages = useCallback(async (reset = false) => {
    if (!roomId && !isDirect) return
    if (loadingRef.current) return   // prevent duplicate calls

    // BUG FIX #2: reset the ref synchronously before the async call
    if (reset) pageRef.current = 0

    const currentPage = pageRef.current
    loadingRef.current = true
    setLoading(true)

    try {
      const res = isDirect
        ? await messageApiService.getDirect(otherUserId, currentPage, PAGE_SIZE)
        : await messageApiService.getByRoom(roomId, currentPage, PAGE_SIZE)

      const data = res.data.data?.content || res.data.data || []
      // API returns newest-first — reverse so oldest is at top
      const sorted = [...data].reverse()

      const normalized = sorted.map(normalizeServerMessage)

      const clearedAtStr = isDirect ? chatHistoryManager.getClearedAt(null, otherUserId) : chatHistoryManager.getClearedAt(roomId, null)
      const clearedAt = clearedAtStr ? new Date(clearedAtStr) : new Date(0)
      const deletedIds = chatHistoryManager.getDeletedMessageIds()

      const visible = normalized.filter(m => {
        if (deletedIds.includes(m.id)) return false
        if (new Date(m.sentAt) <= clearedAt) return false
        return true
      })

      if (reset) {
        setMessages(visible)
      } else {
        setMessages(prev => [...visible, ...prev])
      }

      // Advance page ref after successful fetch
      pageRef.current = currentPage + 1
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [roomId, otherUserId, isDirect, normalizeServerMessage])
  // Note: intentionally NOT including pageRef.current in deps — it's a ref

  // ── Load more (scroll up) ─────────────────────────────
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) loadMessages(false)
  }, [hasMore, loadMessages])

  // ── Subscribe to WebSocket room ───────────────────────
  useEffect(() => {
    // Reset messages immediately when room/target changes
    setMessages([])
    setHasMore(true)

    if (isDirect) {
      loadMessages(true)
      if (!user?.id) return

      const targetId = Number(otherUserId)
      const handleDirectMessage = (frame) => {
        // Handle real-time message edits in DM
        if (frame.type === 'MESSAGE_EDIT') {
          setMessages(prev => prev.map(m =>
            String(m.id) === String(frame.messageId)
              ? { ...m, content: frame.newContent, isEdited: true }
              : m
          ))
          return
        }

        // Handle message deletes in DM
        if (frame.type === 'MESSAGE_DELETE') {
          setMessages(prev => prev.map(m =>
            String(m.id) === String(frame.messageId)
              ? { ...m, isDeleted: true, content: 'This message was deleted' }
              : m
          ))
          return
        }

        // Handle delivery status updates (tick changes)
        if (frame.type === 'MESSAGE_STATUS') {
          setMessages(prev => prev.map(m =>
            String(m.id) === String(frame.messageId)
              ? { ...m, deliveryStatus: frame.status || frame.deliveryStatus }
              : m
          ))
          return
        }

        if (frame.type !== 'CHAT_MESSAGE') return
        if (frame.roomId != null) return

        const senderId = Number(frame.senderId)
        const recipientId = Number(frame.recipientId)
        const me = Number(user.id)
        const isConversationMessage =
          (senderId === me && recipientId === targetId) ||
          (senderId === targetId && recipientId === me)

        if (!isConversationMessage) return

        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(frame.messageId))) return prev
          return [...prev, normalizeServerMessage({
            id:               frame.messageId,
            roomId:           null,
            senderId:         frame.senderId,
            senderName:       frame.senderName,
            recipientId:      frame.recipientId,
            content:          frame.content,
            type:             frame.messageType || 'TEXT',
            mediaUrl:         frame.mediaUrl,
            replyToMessageId: frame.replyToId,
            deliveryStatus:   frame.deliveryStatus || 'SENT',
            sentAt:           frame.sentAt || new Date().toISOString(),
          })]
        })

        // If message is from the other person and we're viewing the conversation,
        // immediately mark it as READ
        if (senderId === targetId && frame.messageId) {
          messageApiService.updateStatus(frame.messageId, 'READ')
            .then(() => {
              wsService.sendStatusUpdate(frame.messageId, frame.senderId, null, 'READ')
            })
            .catch(() => {})
        }
      }

      wsService.subscribeToUser(user.id, handleDirectMessage)
      return () => {
        wsService.unsubscribeFromUser(user.id, handleDirectMessage)
      }
    }

    if (!roomId) return
    loadMessages(true)

    const handleWsMessage = (frame) => {
      const { type, ...payload } = frame

      switch (type) {
        case 'CHAT_MESSAGE':
          setMessages(prev => {
            if (prev.some(m => String(m.id) === String(payload.messageId))) return prev
            return [...prev, normalizeServerMessage({
              id:               payload.messageId,
              roomId:           payload.roomId,
              senderId:         payload.senderId,
              senderName:       payload.senderName,
              content:          payload.content,
              type:             payload.messageType || 'TEXT',
              mediaUrl:         payload.mediaUrl,
              replyToMessageId: payload.replyToId,
              deliveryStatus:   'SENT',
              sentAt:           payload.sentAt || new Date().toISOString(),
            })]
          })
          // Clear typing indicator for this sender when they send
          setTypingUsers(prev => {
            const next = new Set(prev)
            next.delete(payload.senderId)
            return next
          })
          break

        case 'MESSAGE_EDIT':
          setMessages(prev => prev.map(m =>
            String(m.id) === String(payload.messageId)
              ? { ...m, content: payload.newContent, isEdited: true }
              : m
          ))
          break

        case 'MESSAGE_DELETE':
          setMessages(prev => prev.map(m =>
            String(m.id) === String(payload.messageId)
              ? { ...m, isDeleted: true, content: 'This message was deleted' }
              : m
          ))
          break

        case 'REACTION':
          setMessages(prev => prev.map(m => {
            if (String(m.id) !== String(payload.messageId)) return m

            const reactions = { ...(m.reactions || {}) }
            const existing = reactions[payload.emoji]
            const currentCount = Array.isArray(existing)
              ? existing.length
              : Number(existing || 0)
            reactions[payload.emoji] = currentCount + 1

            const myReactions = new Set(m.myReactions || [])
            if (payload.senderId === user?.id) {
              myReactions.add(payload.emoji)
            }

            return { ...m, reactions, myReactions: Array.from(myReactions) }
          }))
          break

        case 'TYPING_INDICATOR':
          if (payload.senderId === user?.id) break
          if (payload.isTyping) {
            setTypingUsers(prev => new Set([...prev, payload.senderId]))
            clearTimeout(typingTimers.current[payload.senderId])
            typingTimers.current[payload.senderId] = setTimeout(() => {
              setTypingUsers(prev => {
                const next = new Set(prev)
                next.delete(payload.senderId)
                return next
              })
            }, 4000)
          } else {
            clearTimeout(typingTimers.current[payload.senderId])
            setTypingUsers(prev => {
              const next = new Set(prev)
              next.delete(payload.senderId)
              return next
            })
          }
          break

        case 'MESSAGE_STATUS':
          setMessages(prev => prev.map(m =>
            String(m.id) === String(payload.messageId)
              ? { ...m, deliveryStatus: payload.status }
              : m
          ))
          break

        case 'READ_RECEIPT':
          // When someone reads room messages, update all messages from the current user
          // that were sent at or before the read receipt's upToMessageId to READ
          if (payload.readerId !== user?.id) {
            setMessages(prev => prev.map(m => {
              // Only update own messages that aren't already READ
              if (String(m.senderId) !== String(user?.id)) return m
              if (m.deliveryStatus === 'READ') return m
              // Update all messages up to the specified ID
              if (payload.upToMessageId && Number(m.id) <= Number(payload.upToMessageId)) {
                return { ...m, deliveryStatus: 'READ' }
              }
              return m
            }))
          }
          break

        default: break
      }
    }
    // Also subscribe to the personal queue for MESSAGE_STATUS frames
    // (some servers emit delivery/read updates to the user's personal topic)
    const handlePersonalStatus = (frame) => {
      if (frame.type !== 'MESSAGE_STATUS') return
      // Update delivery status for matching message id
      setMessages(prev => prev.map(m =>
        String(m.id) === String(frame.messageId)
          ? { ...m, deliveryStatus: frame.status || frame.deliveryStatus }
          : m
      ))
    }

    // BUG FIX #3 (companion): subscribeToRoom now queues internally
    // if WS isn't connected yet — no need for manual onConnect dance here.
    // We keep the onConnect fallback for rooms opened before first connect.
    let detachConnectHandler = null

    if (wsService.isConnected()) {
      wsService.subscribeToRoom(roomId, handleWsMessage)
      if (user?.id) wsService.subscribeToUser(user.id, handlePersonalStatus)
    } else {
      // wsService will queue the subscription — but also register onConnect
      // so the handler is called once connected in case queuing didn't fire yet
      wsService.subscribeToRoom(roomId, handleWsMessage)
      detachConnectHandler = wsService.onConnect(() => {
        wsService.subscribeToRoom(roomId, handleWsMessage)
        if (user?.id) wsService.subscribeToUser(user.id, handlePersonalStatus)
      })
    }

    return () => {
      if (detachConnectHandler) detachConnectHandler()
      wsService.unsubscribeFromRoom(roomId)
      if (user?.id) wsService.unsubscribeFromUser(user.id, handlePersonalStatus)
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [roomId, isDirect, otherUserId, user?.id, loadMessages, normalizeServerMessage])
  // Note: loadMessages intentionally omitted from deps to avoid
  // re-subscribing on every render — roomId/isDirect are the real triggers

  // ── Send message ──────────────────────────────────────
  const sendMessage = useCallback(async (
    content,
    type = 'TEXT',
    replyToId = null,
    mediaUrl = null,
    attachmentFile = null,
  ) => {
    if (attachmentFile) {
      try {
        let res

        if (isDirect) {
          if (type === 'IMAGE') {
            res = await messageApiService.sendDirectImage(otherUserId, attachmentFile, content, replyToId)
          } else {
            res = await messageApiService.sendDirectFile(otherUserId, attachmentFile, content, replyToId)
          }
        } else if (roomId) {
          if (type === 'IMAGE') {
            res = await messageApiService.sendImage(roomId, attachmentFile, content, replyToId)
          } else {
            res = await messageApiService.sendFile(roomId, attachmentFile, content, replyToId)
          }
        }

        const created = normalizeServerMessage(res?.data?.data)
        if (created?.id) {
          setMessages(prev => {
            if (prev.some(m => String(m.id) === String(created.id))) return prev
            return [...prev, created]
          })

          // FIX: Broadcast media message to other room members via websocket
          // Media messages are created via REST API but need to be broadcast to all users
          if (wsService.isConnected()) {
            if (isDirect) {
              wsService.broadcastMessage({
                type: 'CHAT_MESSAGE_BROADCAST',
                messageId: created.id,
                recipientId: Number(otherUserId),
                senderId: created.senderId,
                senderName: created.senderName,
                content: created.content,
                messageType: created.type,
                mediaUrl: created.mediaUrl,
                replyToId: created.replyToMessageId,
                deliveryStatus: 'SENT',
                sentAt: created.sentAt,
              })
            } else if (roomId) {
              wsService.broadcastMessage({
                type: 'CHAT_MESSAGE_BROADCAST',
                messageId: created.id,
                roomId,
                senderId: created.senderId,
                senderName: created.senderName,
                content: created.content,
                messageType: created.type,
                mediaUrl: created.mediaUrl,
                replyToId: created.replyToMessageId,
                deliveryStatus: 'SENT',
                sentAt: created.sentAt,
              })
            }
          }
        }
      } catch (err) {
        toast.error('Failed to upload attachment')
        console.error('Media upload error:', err)
      }
      return
    }

    if (isDirect) {
      if (!wsService.isConnected()) {
        toast.error('Not connected. Please wait…')
        return
      }

      wsService.sendMessage({
        recipientId: Number(otherUserId),
        content,
        type,
        replyToId,
        mediaUrl,
      })
      return
    }

    if (!wsService.isConnected()) {
      toast.error('Not connected. Please wait…')
      return
    }
    wsService.sendMessage({ roomId, content, type, replyToId, mediaUrl })
  }, [roomId, otherUserId, isDirect, normalizeServerMessage])

  const reactToMessage = useCallback(async (messageId, emoji) => {
    const current = messages.find(m => String(m.id) === String(messageId))
    if (!current) return

    const alreadyReacted = (current.myReactions || []).includes(emoji)

    try {
      if (alreadyReacted) {
        const res = await messageApiService.removeReaction(messageId, emoji)
        const updated = normalizeServerMessage(res.data?.data)
        setMessages(prev => prev.map(m => {
          if (String(m.id) !== String(messageId)) return m
          return {
            ...m,
            ...updated,
            myReactions: (m.myReactions || []).filter(e => e !== emoji),
          }
        }))
      } else {
        const res = await messageApiService.addReaction(messageId, emoji)
        const updated = normalizeServerMessage(res.data?.data)
        setMessages(prev => prev.map(m => {
          if (String(m.id) !== String(messageId)) return m
          return {
            ...m,
            ...updated,
            myReactions: Array.from(new Set([...(m.myReactions || []), emoji])),
          }
        }))
      }
    } catch {
      toast.error('Failed to update reaction')
    }
  }, [messages, normalizeServerMessage])

  // ── Edit message ──────────────────────────────────────
  const editMessage = useCallback(async (messageId, content) => {
    try {
      const res = await messageApiService.edit(messageId, { content })
      const updated = normalizeServerMessage(res.data?.data)
      setMessages(prev => prev.map(m => {
        if (String(m.id) !== String(messageId)) return m
        return { ...m, ...updated }
      }))
      // Broadcast edit to all room/DM participants via WebSocket
      wsService.sendEdit(
        isDirect ? null : roomId,
        isDirect ? Number(otherUserId) : null,
        messageId,
        content
      )
    } catch {
      toast.error('Failed to edit message')
    }
  }, [roomId, otherUserId, isDirect, normalizeServerMessage])

  // ── Delete message ────────────────────────────────────
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await messageApiService.delete(messageId)
      setMessages(prev => prev.map(m =>
        String(m.id) === String(messageId)
          ? { ...m, isDeleted: true, content: 'This message was deleted' }
          : m
      ))
      // Broadcast delete to all participants so the bubble disappears immediately
      wsService.sendDelete(
        isDirect ? null : roomId,
        isDirect ? Number(otherUserId) : null,
        messageId,
        false
      )
    } catch {
      toast.error('Failed to delete message')
    }
  }, [roomId, otherUserId, isDirect])

  const clearAllMessages = useCallback(() => {
    setMessages([])
    pageRef.current = 0
    setHasMore(false)
  }, [])

  // ── Local Deletions ───────────────────────────────────
  const clearLocalChat = useCallback(() => {
    chatHistoryManager.setClearedAt(isDirect ? null : roomId, isDirect ? otherUserId : null)
    setMessages([])
  }, [roomId, otherUserId, isDirect])

  const deleteLocalMessage = useCallback((messageId) => {
    chatHistoryManager.deleteMessageForMe(messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [])

  return {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    reactToMessage,
    editMessage,
    deleteMessage,
    clearAllMessages,
    clearLocalChat,
    deleteLocalMessage,
    typingUsers,
  }
}
