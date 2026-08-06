/**
 * /resources/guide — Hướng dẫn sử dụng theo từng bước. Nội dung dựa trên luồng SẢN PHẨM THẬT
 * (đăng ký CLB → thành viên → kỳ quỹ → thu/chi → điểm danh → giải đấu → báo cáo → AIDO).
 */
import { UserPlus, Users, Wallet, CalendarCheck, Trophy, FileBarChart, Cpu, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER, CtaButtons } from '../PublicPage'

const STEPS: { icon: LucideIcon; title: string; desc: string; points: string[] }[] = [
  {
    icon: UserPlus, title: '1 · Tạo CLB & tài khoản quản trị',
    desc: 'Đăng ký miễn phí, tạo hồ sơ CLB (tên, mã CLB, bộ môn) và tài khoản quản trị đầu tiên.',
    points: ['Nhập tên & mã CLB', 'Có thể áp mã giới thiệu để nhận ưu đãi', 'Vào ngay dashboard sau khi tạo'],
  },
  {
    icon: Users, title: '2 · Thêm thành viên',
    desc: 'Thêm thành viên thủ công hoặc nhập hàng loạt từ Excel; phân quyền theo vai trò.',
    points: ['Nhập lẻ hoặc import Excel', 'Vai trò: Quản trị / Thủ quỹ / Thành viên', 'Cấp tài khoản đăng nhập cho thành viên (tuỳ chọn)'],
  },
  {
    icon: Wallet, title: '3 · Mở kỳ quỹ & thu/chi',
    desc: 'Tạo kỳ quỹ, ghi nhận đóng quỹ, chi phí (sân, sinh hoạt) và theo dõi công nợ minh bạch.',
    points: ['Quỹ chung & quỹ mini tách bạch', 'Xác nhận đóng quỹ, đối soát công nợ', 'Mọi khoản có lịch sử rõ ràng'],
  },
  {
    icon: CalendarCheck, title: '4 · Tạo buổi chơi & điểm danh',
    desc: 'Lên lịch buổi, cho thành viên đăng ký, check-in và điểm danh thực tế.',
    points: ['Đăng ký buổi / self check-in', 'Điểm danh PRESENT/ABSENT', 'Tự phân bổ chi phí theo buổi'],
  },
  {
    icon: Trophy, title: '5 · Tổ chức giải đấu & minigame',
    desc: 'Tạo giải, chia đội, xếp lịch đấu, ghi kết quả và xem bảng xếp hạng.',
    points: ['Nhiều thể thức (đôi ngẫu nhiên, vòng tròn, loại trực tiếp…)', 'Bảng điểm & xếp hạng tự động', 'Ghi nhận thành tích'],
  },
  {
    icon: FileBarChart, title: '6 · Xem báo cáo & xuất PDF',
    desc: 'Theo dõi dashboard thời gian thực và xuất báo cáo thu/chi, công nợ, hoạt động ra PDF/Excel.',
    points: ['Dashboard số liệu thật', 'Xuất PDF / Excel / Ảnh', 'AIDO Executive Report theo kỳ quỹ'],
  },
  {
    icon: Cpu, title: '7 · Bật đội ngũ AI (AIDO)',
    desc: 'Để Maika phân tích, Lisa hỗ trợ thành viên, Hermes điều phối, Mít Đặc thực thi và Notification AI nhắc việc.',
    points: ['Hỏi–đáp cùng Lisa', 'Nhận khuyến nghị từ Maika', 'Tự gửi báo cáo điều hành hằng tháng'],
  },
]

export function Guide() {
  return (
    <PublicPage title="Hướng dẫn sử dụng">
      <PageHero
        eyebrow="Tài nguyên · Hướng dẫn"
        title="Bắt đầu với PickleFund trong vài phút"
        desc="7 bước từ tạo CLB đến vận hành cùng AI. Không cần cài đặt — chạy trực tiếp trên trình duyệt, dùng được cả trên điện thoại."
      >
        <CtaButtons />
      </PageHero>

      <section className={`${PUBLIC_CONTAINER} py-14`}>
        <div className="mx-auto max-w-3xl space-y-4">
          {STEPS.map((s) => (
            <div key={s.title} className="flex gap-4 rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                <s.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold">{s.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{s.desc}</p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {s.points.map((p) => (
                    <li key={p} className="rounded-full border px-2.5 py-1 text-[11px] font-medium [border-color:var(--pf-border)] [color:var(--pf-color-muted)]">{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border p-6 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
          <p className="text-[15px] font-bold [color:var(--pf-text)]">Cần hỗ trợ khi triển khai?</p>
          <p className="mt-1 text-sm [color:var(--pf-color-muted)]">Hướng dẫn chi tiết từng màn hình có sẵn ngay trong app (nút “Hướng dẫn”). Bạn cũng có thể liên hệ đội ngũ hỗ trợ.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a href="/login" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>Dùng thử ngay <ArrowRight size={15} /></a>
            <a href="/contact" className="rounded-full border px-5 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">Liên hệ hỗ trợ</a>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
