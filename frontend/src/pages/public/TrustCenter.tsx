/**
 * /trust — Trung tâm Tin cậy. Trung thực: CHỈ nêu thực hành có thật (multi-tenant, RBAC,
 * human-in-the-loop tài chính, HTTPS, sao lưu định kỳ). Ghi RÕ phần CHƯA có (chứng chỉ tuân
 * thủ chính thức, cam kết uptime công bố) là "đang xây dựng" — KHÔNG bịa chứng chỉ/con số.
 */
import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, Users, Bot, DatabaseBackup, Server, Info, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

const PRACTICES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Users, title: 'Phân tách dữ liệu theo CLB', desc: 'Kiến trúc multi-tenant: dữ liệu của mỗi CLB được tách biệt, một CLB không truy cập được dữ liệu của CLB khác.' },
  { icon: Lock, title: 'Kiểm soát truy cập theo vai trò', desc: 'RBAC: quản trị, thủ quỹ và thành viên chỉ thấy đúng phần dữ liệu và thao tác được phép.' },
  { icon: Bot, title: 'AI có kiểm soát của con người', desc: 'Mọi hành động quan trọng, đặc biệt về tài chính, đều cần con người phê duyệt. AI không tự quyết.' },
  { icon: Server, title: 'Truyền tải mã hóa', desc: 'Truy cập qua HTTPS; thông tin đăng nhập và dữ liệu được truyền qua kênh mã hóa.' },
  { icon: DatabaseBackup, title: 'Sao lưu định kỳ', desc: 'Hệ thống thực hiện sao lưu định kỳ để phục vụ khôi phục khi cần.' },
  { icon: ShieldCheck, title: 'Nguyên tắc tối thiểu dữ liệu', desc: 'Chỉ thu thập dữ liệu cần thiết cho vận hành CLB; không bán dữ liệu người dùng.' },
]

export function TrustCenter() {
  return (
    <PublicPage title="Trung tâm Tin cậy">
      <PageHero
        eyebrow="Trung tâm Tin cậy"
        title="Bảo mật, quyền riêng tư và độ tin cậy"
        desc="Những thực hành mà PickleFund đang áp dụng để bảo vệ dữ liệu CLB của bạn — trình bày minh bạch, kèm cả những phần còn đang hoàn thiện."
      />

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICES.map((p) => (
            <div key={p.title} className="rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                <p.icon size={20} />
              </div>
              <p className="text-[15px] font-bold">{p.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Minh bạch về phần chưa có */}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-color-muted)]"><Info size={14} /> Đang hoàn thiện</div>
          <p className="text-[14px] font-bold [color:var(--pf-text)]">Chúng tôi nói thẳng những gì chưa có</p>
          <ul className="mt-3 space-y-2">
            {[
              'Chứng chỉ tuân thủ chính thức (ví dụ ISO/SOC): chưa có — sẽ công bố tại đây nếu đạt được.',
              'Cam kết mức độ sẵn sàng dịch vụ (uptime SLA) công bố: đang xây dựng.',
              'Báo cáo kiểm thử bảo mật độc lập: đang trong kế hoạch.',
            ].map((x) => (
              <li key={x} className="flex gap-2 text-[13.5px] leading-relaxed [color:var(--pf-color-muted)]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-color-warning)]" />
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
            Cần thông tin bảo mật cụ thể cho quyết định triển khai? <Link to="/contact" className="font-semibold [color:var(--pf-primary)]">Liên hệ đội ngũ</Link> — chúng tôi trả lời trung thực theo đúng hiện trạng.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-center">
          <Link to="/legal/privacy" className="rounded-full border px-5 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">Chính sách bảo mật</Link>
          <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>Đặt câu hỏi bảo mật <ArrowRight size={15} /></Link>
        </div>
      </section>
    </PublicPage>
  )
}
