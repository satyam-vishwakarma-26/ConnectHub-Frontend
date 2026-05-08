import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Trash2, Ban, CheckCircle,
  RefreshCw, AlertTriangle, Search, Hash, Lock, History,
  Activity, Radio, FileText, Send, ArrowUpCircle, ArrowDownCircle, ArrowLeft
} from 'lucide-react'
import { adminApiService } from '../../api/adminApi'
import { messageApiService } from '../../api/messageApi'
import { Input, Button, Badge, Spinner, Modal } from '../../components/ui'
import Avatar from '../../components/ui/Avatar'
import { ROLE_LABELS, timeAgo, formatFullTime } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'users' | 'rooms' | 'broadcast' | 'audit'

  // ── Overview state ──────────────────────────────────────
  const [analytics, setAnalytics] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  // ── Users state ─────────────────────────────────────────
  const [users, setUsers]       = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [usersLoading, setUsersLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [deleteModal, setDeleteModal] = useState(null)

  // ── Rooms state ─────────────────────────────────────────
  const [rooms, setRooms]             = useState([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomSearch, setRoomSearch]   = useState('')
  const [deleteRoomModal, setDeleteRoomModal]       = useState(null)
  const [clearHistoryModal, setClearHistoryModal]   = useState(null)
  const [roomActionLoading, setRoomActionLoading]   = useState(false)

  // ── Broadcast state ─────────────────────────────────────
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' })
  const [broadcastLoading, setBroadcastLoading] = useState(false)

  // ── Audit state ─────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)

  const loadOverview = async () => {
    setOverviewLoading(true)
    try {
      const res = await adminApiService.getAnalytics()
      setAnalytics(res.data || {})
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setOverviewLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await adminApiService.getAllUsers()
      setUsers(res.data || [])
      setFilteredUsers(res.data || [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  const loadRooms = async () => {
    setRoomsLoading(true)
    try {
      const res = await adminApiService.getAllRooms()
      setRooms(res.data || [])
    } catch {
      toast.error('Failed to load rooms')
    } finally {
      setRoomsLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const res = await adminApiService.getAuditLogs()
      setAuditLogs(res.data || [])
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'overview') loadOverview()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'rooms') loadRooms()
    if (activeTab === 'audit') loadAuditLogs()
  }, [activeTab])

  useEffect(() => {
    const q = search.toLowerCase()
    setFilteredUsers(q
      ? users.filter(u =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q))
      : users
    )
  }, [search, users])

  const handleSuspend = async (user) => {
    try {
      await adminApiService.suspendUser(user.id)
      toast.success(`${user.username} suspended`)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const handleReactivate = async (user) => {
    try {
      await adminApiService.reactivateUser(user.id)
      toast.success(`${user.username} reactivated`)
      loadUsers()
    } catch {
      toast.error('Failed to reactivate')
    }
  }

  const handleDelete = async () => {
    try {
      await adminApiService.deleteUser(deleteModal.id)
      toast.success(`${deleteModal.username} deleted permanently`)
      setDeleteModal(null)
      loadUsers()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handlePromote = async (user) => {
    try {
      await adminApiService.promoteUser(user.id)
      toast.success(`${user.username} promoted to Platform Admin`)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to promote')
    }
  }

  const handleDemote = async (user) => {
    try {
      await adminApiService.demoteUser(user.id)
      toast.success(`${user.username} demoted to regular User`)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to demote')
    }
  }

  const handleDeleteRoom = async () => {
    setRoomActionLoading(true)
    try {
      await adminApiService.deleteRoom(deleteRoomModal.id)
      toast.success(`Room "${deleteRoomModal.name}" deleted`)
      setRooms(prev => prev.filter(r => r.id !== deleteRoomModal.id))
      setDeleteRoomModal(null)
    } catch {
      toast.error('Failed to delete room')
    } finally {
      setRoomActionLoading(false)
    }
  }

  const handleClearHistory = async () => {
    setRoomActionLoading(true)
    try {
      await messageApiService.adminDeleteRoomHistory(clearHistoryModal.id)
      toast.success(`Message history cleared for "${clearHistoryModal.name}"`)
      setClearHistoryModal(null)
    } catch {
      toast.error('Failed to clear history')
    } finally {
      setRoomActionLoading(false)
    }
  }

  const handleBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcastData.title || !broadcastData.message) return
    setBroadcastLoading(true)
    try {
      await adminApiService.broadcast(broadcastData)
      toast.success('Broadcast sent successfully')
      setBroadcastData({ title: '', message: '' })
    } catch {
      toast.error('Failed to send broadcast')
    } finally {
      setBroadcastLoading(false)
    }
  }

  const filteredRooms = roomSearch
    ? rooms.filter(r => r.name?.toLowerCase().includes(roomSearch.toLowerCase()))
    : rooms

  return (
    <div className="h-full overflow-y-auto p-6 pt-14 md:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(86,182,198,0.14)' }}>
              <Shield size={18} style={{ color: 'var(--blue)' }} />
            </div>
            <h1 className="text-2xl font-bold"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              Platform Admin
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            System overview and platform management
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Chat
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl flex-wrap" style={{ background: 'var(--bg-tertiary)', width: 'fit-content' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'rooms', label: 'Rooms', icon: Hash },
          { id: 'broadcast', label: 'Broadcast', icon: Radio },
          { id: 'audit', label: 'Audit Logs', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--brand)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
            }}
          >
            <tab.icon size={14} />{tab.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ══════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {overviewLoading ? (
            <div className="flex justify-center py-16"><Spinner size={32} /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users',  value: analytics?.totalUsers || 0,     color: 'var(--brand)', icon: Users },
                { label: 'Active Rooms', value: analytics?.totalRooms || 0,     color: 'var(--blue)', icon: Hash },
                { label: 'Total Messages',value: analytics?.totalMessages || 0, color: 'var(--success)', icon: Send },
                { label: 'Active Connections', value: analytics?.activeConnections || 0, color: 'var(--warning)', icon: Activity },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: s.color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ USERS TAB ═══════════════════════════════════════ */}
      {activeTab === 'users' && (
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <Input
            placeholder="Search users..."
            icon={Search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-md"
          />
          <button onClick={loadUsers} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={18} />
          </button>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id}
                    style={{
                      borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--border)' : 'none',
                      background: !u.isActive ? 'rgba(212,74,74,0.08)' : 'transparent',
                    }}
                    className="hover:bg-opacity-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size={32} showStatus />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{u.fullName || u.username}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="truncate block text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.role === 'PLATFORM_ADMIN' ? 'purple' : 'gray'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Suspended'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.role !== 'PLATFORM_ADMIN' ? (
                          <button onClick={() => handlePromote(u)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--brand)' }} title="Promote to Admin">
                            <ArrowUpCircle size={15} />
                          </button>
                        ) : (
                          <button onClick={() => handleDemote(u)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--warning)' }} title="Demote to User">
                            <ArrowDownCircle size={15} />
                          </button>
                        )}
                        {u.role !== 'PLATFORM_ADMIN' && (
                          u.isActive ? (
                            <button onClick={() => handleSuspend(u)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--warning)' }} title="Suspend">
                              <Ban size={15} />
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(u)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--success)' }} title="Reactivate">
                              <CheckCircle size={15} />
                            </button>
                          )
                        )}
                        {u.role !== 'PLATFORM_ADMIN' && (
                          <button onClick={() => setDeleteModal(u)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--danger)' }} title="Delete">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* ═══ ROOMS TAB ════════════════════════════════════════ */}
      {activeTab === 'rooms' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
            <Input
              placeholder="Search rooms..."
              icon={Search}
              value={roomSearch}
              onChange={e => setRoomSearch(e.target.value)}
              className="max-w-md"
            />
            <button onClick={loadRooms} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={18} />
            </button>
          </div>

          {roomsLoading ? (
            <div className="flex justify-center py-16"><Spinner size={32} /></div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-16">
              <Hash size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No rooms found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                    {['Room ID', 'Name / Type', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: i < filteredRooms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{r.id?.toString().substring(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                               style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
                            {r.type === 'DIRECT_MESSAGE' ? <Lock size={13} /> : <Hash size={13} />}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                            <Badge color={r.type === 'DIRECT_MESSAGE' ? 'purple' : 'green'}>{r.type}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.createdAt ? timeAgo(r.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setClearHistoryModal(r)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--warning)' }} title="Clear history">
                            <History size={15} />
                          </button>
                          <button onClick={() => setDeleteRoomModal(r)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--danger)' }} title="Delete room">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ BROADCAST TAB ════════════════════════════════════ */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Global Broadcast</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Send an immediate platform-wide notification to all connected users via WebSocket.
            </p>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title</label>
                <Input 
                  value={broadcastData.title} 
                  onChange={e => setBroadcastData({...broadcastData, title: e.target.value})} 
                  placeholder="System Maintenance" required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Message</label>
                <textarea 
                  className="w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  rows="4" required placeholder="Type your broadcast message here..."
                  value={broadcastData.message} onChange={e => setBroadcastData({...broadcastData, message: e.target.value})}
                ></textarea>
              </div>
              <Button type="submit" loading={broadcastLoading} className="w-full flex justify-center items-center gap-2">
                <Send size={16} /> Send Broadcast
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ AUDIT LOGS TAB ═══════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Action History</h2>
            <button onClick={loadAuditLogs} className="p-2 rounded-lg hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={18} />
            </button>
          </div>
          {auditLoading ? (
            <div className="flex justify-center py-16"><Spinner size={32} /></div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                    {['Time', 'Admin', 'Action', 'Entity', 'Details', 'IP'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => (
                    <tr key={log.id} style={{ borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border)' : 'none' }} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatFullTime(log.createdAt)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--brand)' }}>@{log.actorUsername}</td>
                      <td className="px-4 py-3">
                        <Badge color="blue">{log.actionType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{log.entityType} ({log.entityId})</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>{log.description}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals for Users and Rooms */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete user permanently">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(212,74,74,0.08)', border: '1px solid rgba(212,74,74,0.22)' }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--danger)' }}>This action cannot be undone</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Permanently delete <strong>{deleteModal?.username}</strong>?
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn-primary btn-danger flex-1 flex items-center justify-center gap-2"><Trash2 size={15} /> Delete</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteRoomModal} onClose={() => setDeleteRoomModal(null)} title="Delete room">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(212,74,74,0.08)', border: '1px solid rgba(212,74,74,0.22)' }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--danger)' }}>This action cannot be undone</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteRoomModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDeleteRoom} disabled={roomActionLoading} className="btn-primary btn-danger flex-1"><Trash2 size={15} /> Delete</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!clearHistoryModal} onClose={() => setClearHistoryModal(null)} title="Clear history">
        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={() => setClearHistoryModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleClearHistory} disabled={roomActionLoading} className="btn-primary" style={{background: 'var(--warning)'}}><History size={15} /> Clear</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
