export const chatHistoryManager = {
  getClearedAt: (roomId, dmTargetId) => {
    const key = roomId ? `cleared_room_${roomId}` : `cleared_dm_${dmTargetId}`
    return localStorage.getItem(key)
  },

  setClearedAt: (roomId, dmTargetId) => {
    const key = roomId ? `cleared_room_${roomId}` : `cleared_dm_${dmTargetId}`
    localStorage.setItem(key, new Date().toISOString())
  },

  getDeletedMessageIds: () => {
    try {
      return JSON.parse(localStorage.getItem('deleted_message_ids') || '[]')
    } catch {
      return []
    }
  },

  deleteMessageForMe: (messageId) => {
    try {
      const deleted = JSON.parse(localStorage.getItem('deleted_message_ids') || '[]')
      if (!deleted.includes(messageId)) {
        deleted.push(messageId)
        localStorage.setItem('deleted_message_ids', JSON.stringify(deleted))
      }
    } catch {
      localStorage.setItem('deleted_message_ids', JSON.stringify([messageId]))
    }
  }
}
