import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// ─────────────────────────────────────────────────────────────
//  BUG FIX #3 — Subscription queue
//  Previously: subscribeToRoom() silently returned if WS wasn't
//  connected yet.  Any room opened before the handshake completed
//  received zero live messages — no error, just silence.
//
//  Fix: store pending subscriptions in a Map keyed by destination.
//  When onConnect fires, replay every pending subscription.
// ─────────────────────────────────────────────────────────────

class WebSocketService {
  constructor() {
    this.client = null
    this.subscriptions = new Map()          // active STOMP subscriptions
    this.pendingSubscriptions = new Set()   // destinations queued before connect
    this.destinationHandlers = new Map()    // destination -> Set<callback>
    this.connected = false
    this.reconnectDelay = 3000
    this.onConnectCallbacks = new Set()
    this.onDisconnectCallbacks = new Set()
  }

  // ── Connect ───────────────────────────────────────────
  connect(token) {
    if (this.connected) return

    const API_BASE_URL = import.meta.env.VITE_API_URL || ''
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        this.connected = true
        console.log('[WS] Connected')

        // ── Replay pending subscriptions ──────────────
        this.pendingSubscriptions.forEach((dest) => {
          console.log('[WS] Replaying queued subscription:', dest)
          this._doSubscribe(dest)
        })
        this.pendingSubscriptions.clear()

        this.onConnectCallbacks.forEach(cb => cb())
      },

      onDisconnect: () => {
        this.connected = false
        console.log('[WS] Disconnected')
        this.onDisconnectCallbacks.forEach(cb => cb())
      },

      onStompError: frame => {
        console.error('[WS] STOMP error:', frame.headers?.message)
      },
    })

    this.client.activate()
  }

  // ── Disconnect ────────────────────────────────────────
  disconnect() {
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.subscriptions.clear()
    this.pendingSubscriptions.clear()
    this.client?.deactivate()
    this.connected = false
  }

  // ── Internal subscribe helper ─────────────────────────
  _doSubscribe(dest) {
    if (this.subscriptions.has(dest)) return
    const sub = this.client.subscribe(dest, msg => {
      try {
        const payload = JSON.parse(msg.body)
        const handlers = this.destinationHandlers.get(dest)
        handlers?.forEach(cb => {
          try {
            cb(payload)
          } catch (e) {
            console.error('[WS] Handler error:', e)
          }
        })
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    })
    this.subscriptions.set(dest, sub)
  }

  _addHandler(dest, callback) {
    if (!this.destinationHandlers.has(dest)) {
      this.destinationHandlers.set(dest, new Set())
    }
    this.destinationHandlers.get(dest).add(callback)
  }

  _removeHandler(dest, callback = null) {
    if (!this.destinationHandlers.has(dest)) return
    if (!callback) {
      this.destinationHandlers.delete(dest)
      return
    }
    const handlers = this.destinationHandlers.get(dest)
    handlers.delete(callback)
    if (handlers.size === 0) this.destinationHandlers.delete(dest)
  }

  _unsubscribeDestination(dest) {
    this.pendingSubscriptions.delete(dest)
    const sub = this.subscriptions.get(dest)
    if (sub) {
      sub.unsubscribe()
      this.subscriptions.delete(dest)
    }
  }

  // ── Subscribe to room topic ───────────────────────────
  // BUG FIX #3: queue subscription if not yet connected
  subscribeToRoom(roomId, callback) {
    const dest = `/topic/room/${roomId}`
    this._addHandler(dest, callback)
    if (this.subscriptions.has(dest)) return

    if (!this.client?.connected) {
      // Queue it — will be replayed in onConnect
      console.log('[WS] Queuing subscription until connected:', dest)
      this.pendingSubscriptions.add(dest)
      return
    }

    this._doSubscribe(dest)
  }

  // ── Subscribe to personal queue ───────────────────────
  subscribeToUser(userId, callback) {
    const dest = `/topic/user/${userId}`
    this._addHandler(dest, callback)
    if (this.subscriptions.has(dest)) return

    if (!this.client?.connected) {
      this.pendingSubscriptions.add(dest)
      return
    }

    this._doSubscribe(dest)
  }

  unsubscribeFromUser(userId, callback = null) {
    const dest = `/topic/user/${userId}`
    this._removeHandler(dest, callback)
    if (this.destinationHandlers.has(dest)) return
    this._unsubscribeDestination(dest)
  }

  // ── Subscribe to presence ─────────────────────────────
  subscribeToPresence(callback) {
    const dest = '/topic/presence'
    this._addHandler(dest, callback)
    if (this.subscriptions.has(dest)) return

    if (!this.client?.connected) {
      this.pendingSubscriptions.add(dest)
      return
    }

    this._doSubscribe(dest)
  }

  // ── Unsubscribe from a room ───────────────────────────
  unsubscribeFromRoom(roomId, callback = null) {
    const dest = `/topic/room/${roomId}`
    this._removeHandler(dest, callback)
    if (this.destinationHandlers.has(dest)) return
    this._unsubscribeDestination(dest)
  }

  // ── Send message ──────────────────────────────────────
  sendMessage(payload) {
    this._send('/app/chat.send', payload)
  }

  // BUG FIX #3: typing also queues gracefully — but typing events
  // are fire-and-forget so we only send if connected (no queue needed)
  sendTyping(roomId, recipientId, isTyping) {
    if (!this.connected) return
    this._send('/app/chat.typing', { roomId, recipientId, isTyping })
  }

  sendReadReceipt(roomId, upToMessageId) {
    this._send('/app/chat.read', { roomId, upToMessageId })
  }

  // Notify the sender that their message has been delivered/read.
  // This broadcasts a MESSAGE_STATUS event to the sender's personal topic.
  sendStatusUpdate(messageId, senderId, roomId, status = 'READ') {
    this._send('/app/chat.status', { messageId, senderId, roomId, status })
  }

  sendReaction(roomId, messageId, emoji) {
    this._send('/app/chat.react', { roomId, messageId, emoji })
  }

  // ── Broadcast a status change (ONLINE/AWAY/DND/INVISIBLE) ──
  // Call this after a successful REST PUT /presence/status so all
  // connected users see the new status dot immediately.
  sendPresenceUpdate(status) {
    this._send('/app/chat.presence', { status })
  }

  // ── Broadcast a message edit ──────────────────────────────
  // roomId + recipientId are mutually exclusive (one will be null).
  sendEdit(roomId, recipientId, messageId, content) {
    this._send('/app/chat.edit', { roomId, recipientId, messageId, content })
  }

  // ── Broadcast a message delete ────────────────────────────
  // isAdminDelete=true uses the admin REST endpoint server-side.
  sendDelete(roomId, recipientId, messageId, isAdminDelete = false) {
    this._send('/app/chat.delete', { roomId, recipientId, messageId, isAdminDelete })
  }

  // ── Broadcast a pre-persisted message (for media uploads) ───
  // Called after REST API successfully creates a message with media.
  // This sends the message event to all room/user subscribers without
  // re-persisting it (to avoid duplicates).
  broadcastMessage(payload) {
    this._send('/app/chat.broadcast', payload)
  }

  // ── Unsubscribe from presence topic ──────────────────────
  unsubscribeFromPresence(callback = null) {
    const dest = '/topic/presence'
    this._removeHandler(dest, callback)
    if (!this.destinationHandlers.has(dest)) {
      this._unsubscribeDestination(dest)
    }
  }

  _send(dest, body) {
    if (!this.connected || !this.client?.connected) {
      console.warn('[WS] Not connected — cannot send to', dest)
      return
    }
    this.client.publish({ destination: dest, body: JSON.stringify(body) })
  }

  // ── Lifecycle callbacks ───────────────────────────────
  onConnect(cb) {
    this.onConnectCallbacks.add(cb)
    return () => this.onConnectCallbacks.delete(cb)
  }

  onDisconnect(cb) {
    this.onDisconnectCallbacks.add(cb)
    return () => this.onDisconnectCallbacks.delete(cb)
  }

  isConnected() { return this.connected }
}

export const wsService = new WebSocketService()
export default wsService
