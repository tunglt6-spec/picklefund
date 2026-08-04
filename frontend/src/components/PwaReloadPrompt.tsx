import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Banner "Có bản mới — Tải lại" khi service worker phát hiện bản cập nhật.
 * Dùng flow 'prompt' (SW mới CHỜ người dùng bấm reload) thay 'autoUpdate' (reload ngầm,
 * hay bị kẹt bản cũ). Định kỳ tự kiểm bản mới 30 phút/lần. Tự chứa UI (không phụ thuộc toast).
 */
export function PwaReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        setInterval(
          () => {
            r.update().catch(() => {})
          },
          30 * 60 * 1000,
        )
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 14,
        background: 'var(--pf-surface, #ffffff)',
        color: 'var(--pf-text, #0f172a)',
        border: '1px solid var(--pf-border)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 500 }}>
        Có bản cập nhật mới của PickleFund.
      </span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          flexShrink: 0,
          padding: '6px 14px',
          borderRadius: 999,
          border: 'none',
          background: 'var(--pf-primary, #6d5dfb)',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Tải lại
      </button>
    </div>
  )
}
