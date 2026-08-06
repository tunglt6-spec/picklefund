/**
 * ComingSoon — trang tạm cho các mục trong nav/footer đang hoàn thiện ở Phase sau
 * (Blog, Tin tức, Release Notes, Câu chuyện, Trust Center, Pháp lý…). Trung thực: nói rõ
 * đang hoàn thiện + điều hướng về nội dung đã có, thay vì trang trắng/404.
 */
import { useLocation, Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { PublicPage, PUBLIC_CONTAINER } from './PublicPage'

export function ComingSoon() {
  const loc = useLocation()
  return (
    <PublicPage title="Đang hoàn thiện">
      <div className={`${PUBLIC_CONTAINER} py-24 text-center`}>
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
        >
          <Clock size={28} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Nội dung đang được hoàn thiện</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed [color:var(--pf-color-muted)]">
          Trang <code className="rounded [background:var(--pf-surface-muted)] px-1.5 py-0.5 text-[12px]">{loc.pathname}</code> sẽ ra mắt trong phiên bản kế tiếp của website PickleFund. Trong lúc chờ, bạn có thể khám phá các nội dung đã sẵn sàng bên dưới.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="rounded-full border px-5 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]">Trang chủ</Link>
          <Link to="/product/aido" className="rounded-full border px-5 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]">AI Digital Office</Link>
          <Link to="/pricing" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>Bảng giá</Link>
        </div>
      </div>
    </PublicPage>
  )
}
