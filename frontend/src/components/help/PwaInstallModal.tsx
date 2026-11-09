/**
 * PwaInstallModal — hướng dẫn cài PickleFund ra màn hình chính điện thoại (PWA).
 * Có hộp thoại cài gốc (Chrome/Edge/Android) → nút "Cài đặt ngay"; iOS/trình duyệt khác → các bước thủ công.
 */
import { useRef } from 'react'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import { X, Download, Share2, MoreVertical, Plus, CheckCircle2 } from '../icons/mobileLucide'
import { detectInstallPlatform, usePwaInstallStore } from '../../store/pwaInstallStore'

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white [background:var(--pf-primary)]">{n}</span>
    <span className="text-sm leading-relaxed [color:var(--pf-text)]">{children}</span>
  </li>
)

export function PwaInstallModal() {
  const { open, installed, canPrompt, closeInstall, promptInstall } = usePwaInstallStore()
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, panelRef, closeInstall)
  if (!open) return null

  const platform = detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints)

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={closeInstall}>
      <div
        ref={panelRef} role="dialog" aria-modal="true" aria-label="Cài đặt PickleFund ra màn hình chính" tabIndex={-1}
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl outline-none shadow-2xl [background:var(--pf-surface)] sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--pf-border)' }}>
          <h2 className="flex items-center gap-2 text-base font-bold [color:var(--pf-text)]">
            <Download size={18} className="text-[color:var(--pf-primary-text)]" /> Cài app ra màn hình chính
          </h2>
          <button onClick={closeInstall} className="flex h-9 w-9 items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]" aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {installed ? (
            <p className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm [background:var(--pf-surface-muted)] [color:var(--pf-text)]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 [color:var(--pf-color-success)]" />
              <span>PickleFund đã được cài trên thiết bị này. Mở app từ biểu tượng ngoài màn hình chính.</span>
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed [color:var(--pf-color-muted)]">
                Cài PickleFund như một ứng dụng: mở nhanh từ màn hình chính, toàn màn hình, nhận thông báo đẩy. Không cần tải từ App Store / CH Play.
              </p>

              {canPrompt && (
                <button
                  onClick={() => { void promptInstall() }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white active:scale-95"
                  style={{ background: 'var(--pf-grad-brand)' }}
                >
                  <Download size={16} /> Cài đặt ngay
                </button>
              )}

              {platform === 'ios' && (
                <div>
                  <h3 className="mb-2 text-sm font-bold [color:var(--pf-text)]">iPhone / iPad (dùng Safari)</h3>
                  <ol className="space-y-3">
                    <Step n={1}>Mở <b>picklefund.vn</b> bằng <b>Safari</b> (không dùng Chrome/Zalo trong app) và đăng nhập.</Step>
                    <Step n={2}>Bấm nút <b>Chia sẻ</b> <Share2 size={14} className="inline align-[-2px]" /> ở thanh dưới.</Step>
                    <Step n={3}>Kéo xuống, chọn <b>Thêm vào MH chính</b> <Plus size={14} className="inline align-[-2px]" /> rồi bấm <b>Thêm</b>.</Step>
                  </ol>
                </div>
              )}

              {platform === 'android' && !canPrompt && (
                <div>
                  <h3 className="mb-2 text-sm font-bold [color:var(--pf-text)]">Android (dùng Chrome)</h3>
                  <ol className="space-y-3">
                    <Step n={1}>Mở <b>picklefund.vn</b> bằng <b>Chrome</b> và đăng nhập.</Step>
                    <Step n={2}>Bấm menu <b>⋮</b> <MoreVertical size={14} className="inline align-[-2px]" /> góc trên bên phải.</Step>
                    <Step n={3}>Chọn <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào màn hình chính</b>) rồi xác nhận.</Step>
                  </ol>
                </div>
              )}

              {platform === 'desktop' && !canPrompt && (
                <div>
                  <h3 className="mb-2 text-sm font-bold [color:var(--pf-text)]">Máy tính (Chrome / Edge)</h3>
                  <ol className="space-y-3">
                    <Step n={1}>Bấm biểu tượng <b>Cài đặt</b> <Download size={14} className="inline align-[-2px]" /> ở cuối thanh địa chỉ.</Step>
                    <Step n={2}>Xác nhận <b>Cài đặt</b>. Để cài trên điện thoại, mở <b>picklefund.vn</b> bằng điện thoại rồi làm theo hướng dẫn tại đó.</Step>
                  </ol>
                </div>
              )}

              <p className="rounded-xl px-4 py-3 text-xs leading-relaxed [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">
                Sau khi cài, mở app từ biểu tượng PickleFund ngoài màn hình chính. Tài khoản vẫn là tài khoản bạn đang dùng.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
