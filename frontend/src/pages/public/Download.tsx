/**
 * /download — Tải & cài đặt. Trung thực: PickleFund là ứng dụng Web/PWA (cài trực tiếp từ
 * trình duyệt) — hướng dẫn cài thật cho từng nền tảng. Brochure PDF ghi rõ "đang chuẩn bị",
 * không link file giả.
 */
import { Link } from 'react-router-dom'
import { Globe, Smartphone, MonitorSmartphone, Download as DownloadIcon, ArrowRight, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

const PLATFORMS: { icon: LucideIcon; title: string; steps: string[] }[] = [
  { icon: Globe, title: 'Trên trình duyệt (mọi thiết bị)', steps: ['Mở picklefund.uk', 'Đăng nhập và dùng ngay — không cần cài đặt'] },
  { icon: Smartphone, title: 'Điện thoại (PWA)', steps: ['Mở website bằng trình duyệt trên điện thoại', 'Chọn "Thêm vào màn hình chính" (Add to Home Screen)', 'Mở như một ứng dụng độc lập'] },
  { icon: MonitorSmartphone, title: 'Máy tính (PWA)', steps: ['Mở website bằng Chrome/Edge', 'Nhấn biểu tượng "Cài đặt" trên thanh địa chỉ', 'Ứng dụng chạy trong cửa sổ riêng'] },
]

export function Download() {
  return (
    <PublicPage title="Tải & cài đặt">
      <PageHero
        eyebrow="Tải xuống"
        title="Cài PickleFund trên mọi thiết bị"
        desc="PickleFund chạy trực tiếp trên trình duyệt và có thể cài như ứng dụng (PWA) trên điện thoại lẫn máy tính — dữ liệu đồng bộ theo thời gian thực."
      >
        <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
          Mở ứng dụng <ArrowRight size={16} />
        </Link>
      </PageHero>

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-5 lg:grid-cols-3">
          {PLATFORMS.map((p) => (
            <div key={p.title} className="rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                <p.icon size={20} />
              </div>
              <p className="text-[15px] font-bold [color:var(--pf-text)]">{p.title}</p>
              <ol className="mt-3 space-y-2">
                {p.steps.map((s, i) => (
                  <li key={s} className="flex gap-2.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--pf-primary)' }}>{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Brochure — trung thực: đang chuẩn bị */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4 rounded-2xl border p-6 text-center [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] sm:flex-row sm:text-left">
          <FileText size={28} className="shrink-0 [color:var(--pf-color-muted)]" />
          <div className="flex-1">
            <p className="text-[15px] font-bold [color:var(--pf-text)]">Brochure giới thiệu (PDF)</p>
            <p className="mt-0.5 text-[13px] [color:var(--pf-color-muted)]">Đang được chuẩn bị. Trong lúc chờ, bạn có thể xem tổng quan tính năng hoặc liên hệ để nhận tư vấn.</p>
          </div>
          <Link to="/product/aido" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
            <DownloadIcon size={15} /> Xem tổng quan
          </Link>
        </div>
      </section>
    </PublicPage>
  )
}
