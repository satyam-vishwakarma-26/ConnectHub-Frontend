import { useState } from 'react'
import { useSubscriptionStore } from '../../context/subscriptionStore'
import UpgradeModal from './UpgradeModal'

// Map feature key → human-readable name for the modal
const featureLabels = {
  readReceipts:         'Read Receipts',
  messageReactions:     'Message Reactions',
  customRoomAvatar:     'Custom Room Avatars',
  priorityNotifications:'Priority Notifications',
  messageHistoryDays:   'Full Message History',
  maxRooms:             'Unlimited Rooms',
  maxMembersPerRoom:    'Unlimited Members per Room',
  maxFileSizeMb:        'Large File Uploads',
  maxDevices:           'Multi-device Support',
}

/**
 * PlanLimitGuard — wraps a component; if user is FREE and feature is locked,
 * intercepts clicks and shows the UpgradeModal instead.
 *
 * Usage:
 *   <PlanLimitGuard feature="messageReactions">
 *     <ReactionButton />
 *   </PlanLimitGuard>
 */
export default function PlanLimitGuard({ feature, children }) {
  const { isProUser, isFeatureEnabled } = useSubscriptionStore()
  const [modalOpen, setModalOpen] = useState(false)

  const enabled = isFeatureEnabled(feature)

  if (enabled || isProUser) {
    return <>{children}</>
  }

  return (
    <>
      {/* Intercept clicks and show upgrade modal */}
      <div
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setModalOpen(true)
        }}
        style={{ cursor: 'pointer', display: 'contents' }}
        title="PRO feature — upgrade to unlock"
      >
        {/* Slightly dim the child to hint it's locked */}
        <div style={{ opacity: 0.6, pointerEvents: 'none', display: 'contents' }}>
          {children}
        </div>
      </div>

      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={featureLabels[feature] || feature}
      />
    </>
  )
}
