import { Modal } from '../ui/Modal'

interface NotificationContent {
  title: string
  body: string
  createdAt: string
}

/** Full notification reader. Content scrolls; related navigation is an explicit action. */
export function NotificationDetail({ notification, onClose, onOpenRelated }: {
  notification: NotificationContent | null
  onClose: () => void
  onOpenRelated?: () => void
}) {
  if (!notification) return null
  return <Modal open title="Chi tiết thông báo" size="xl" onClose={onClose}
    footer={<>
      <button type="button" className="pf-mobile-chip" onClick={onClose}>Đóng</button>
      {onOpenRelated && <button type="button" className="pf-mobile-chip" onClick={onOpenRelated}>Xem liên quan</button>}
    </>}>
    <article className="pf-notification-detail min-w-0 [overflow-wrap:anywhere]">
      <h3 className="text-base font-bold leading-snug [color:var(--pf-text)]">{notification.title}</h3>
      <p className="mt-2 text-xs [color:var(--pf-text-muted)]">{new Date(notification.createdAt).toLocaleString('vi-VN')}</p>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed [color:var(--pf-text)]">{notification.body}</div>
    </article>
  </Modal>
}
