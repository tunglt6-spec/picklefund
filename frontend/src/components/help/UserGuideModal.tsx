/**
 * UserGuideModal — tài liệu "Hướng dẫn sử dụng" hiển thị dạng modal, mở từ nút trên header.
 * Mục tiêu: người dùng mở app có thể đọc ngay cách dùng toàn bộ chức năng.
 * Nội dung viết cho NGƯỜI DÙNG (khác APP_GUIDE ở backend viết cho AI). ⚠️ Cập nhật khi đổi tính năng.
 */
import { useState } from 'react'
import { X, BookOpen } from 'lucide-react'

interface Section {
  id: string
  icon: string
  title: string
  body: React.ReactNode
}

const B = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed [color:var(--pf-color-muted)]">
    {items.map((it, i) => (
      <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--pf-primary)]" /><span>{it}</span></li>
    ))}
  </ul>
)

const SECTIONS: Section[] = [
  {
    id: 'gioi-thieu', icon: '👋', title: 'Giới thiệu',
    body: (
      <>
        <p className="text-sm leading-relaxed [color:var(--pf-color-muted)]">PickleFund là nền tảng quản lý <b>quỹ &amp; hoạt động</b> cho CLB thể thao <b>đa bộ môn</b>. Menu bên trái gồm các module chính; nút <b>Hướng dẫn</b> trên header mở lại tài liệu này bất cứ lúc nào. Cần hỏi nhanh, bấm <b>Lisa AI</b> (góc dưới trái) — trợ lý trả lời theo dữ liệu CLB của bạn.</p>
        <B items={[
          <><b>4 vai trò</b>: Chủ nhiệm (toàn quyền), Thủ quỹ (tài chính), Thành viên (xem + phần cá nhân), Super Admin (nhiều CLB).</>,
          <>Nguyên tắc: mọi thao tác <b>Thêm/Sửa/Xóa</b> là quyền Chủ nhiệm/Thủ quỹ; Thành viên chủ yếu xem và tự thao tác phần của mình.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'tai-chinh', icon: '💰', title: 'Tài chính',
    body: (
      <B items={[
        <><b>Kỳ Quỹ</b>: tạo Quỹ Chính / Quỹ Phụ, Bắt đầu/Đóng/Mở lại kỳ, tạo phiếu thu cho cả kỳ, nhập Excel đóng quỹ, xem mã QR chuyển khoản.</>,
        <><b>Thu Quỹ (đóng quỹ)</b>: ghi nhận khoản thu (chọn quỹ, thành viên, kỳ, số tiền, hình thức), bật/tắt <b>xác nhận</b> đóng quỹ, xuất phiếu thu/Excel/PDF.</>,
        <><b>Chi phí</b>: thêm khoản chi (loại thuê sân / sinh hoạt; cách chia: đều / theo buổi / theo người tham gia), đính kèm hóa đơn, duyệt trạng thái, xuất PDF.</>,
        <><b>Công nợ</b>: theo dõi ai còn nợ / chờ xác nhận / đã đóng và tỷ lệ thu.</>,
        <><b>Báo cáo</b>: tổng hợp tài chính/thành viên/điểm danh + biểu đồ; xuất PDF / Excel / Infographic.</>,
        <><b>Quỹ Chính</b> đóng theo kỳ (có công nợ, nhắc nợ); <b>Quỹ Phụ</b> thu theo loại (phạt/thưởng/game), người nộp có thể là khách.</>,
      ]} />
    ),
  },
  {
    id: 'thanh-vien', icon: '👥', title: 'Thành viên',
    body: (
      <B items={[
        <><b>Danh sách</b>: thêm/sửa/xóa thành viên, đổi trạng thái (Đang hoạt động / Tạm ngưng / Đã rời), xuất Excel/PDF.</>,
        <><b>Tài khoản</b>: tạo tài khoản (đơn &amp; hàng loạt), đặt lại mật khẩu, khóa/mở khóa.</>,
        <><b>Vai trò &amp; phân quyền</b>: gán Chủ nhiệm / Thủ quỹ / Thành viên.</>,
      ]} />
    ),
  },
  {
    id: 'hoat-dong', icon: '📅', title: 'Hoạt động CLB',
    body: (
      <B items={[
        <><b>Lịch sinh hoạt</b>: xem / tạo / sửa / xóa buổi chơi.</>,
        <><b>Đăng ký buổi</b>: thành viên tự đăng ký (RSVP) buổi sắp tới.</>,
        <><b>Check-in &amp; Điểm danh</b>: điểm danh một chạm; tạo buổi, đánh dấu có mặt, chuyển buổi sang kỳ quỹ khác.</>,
        <><b>Hoạt động tuần</b>: thống kê số buổi, lượt đăng ký/check-in, tỷ lệ chuyên cần.</>,
      ]} />
    ),
  },
  {
    id: 'tao-giai-dau', icon: '🏆', title: 'Tạo Giải đấu',
    body: (
      <>
        <p className="text-sm leading-relaxed [color:var(--pf-color-muted)]">Màn 2 cột: bên <b>trái</b> tạo giải, bên <b>phải</b> xem tổng quan theo bộ môn đang chọn. Nút <b>Danh sách giải</b> để xem tất cả giải.</p>
        <B items={[
          <><b>7 bộ môn</b>: Pickleball, Tennis, Cầu lông, Bóng bàn (đánh đôi/đơn/vòng bảng); Bóng đá, Bóng rổ (vòng tròn hoặc loại trực tiếp); Golf (tính tổng gậy).</>,
          <><b>Tạo giải</b>: chọn bộ môn → điền tên/ngày → thiết lập thể thức. Bóng đá/rổ: dựng đội &amp; cầu thủ, nhập tỉ số. Golf: thêm golfer, nhập gậy từng vòng.</>,
          <>Trong màn giải: bốc thăm, nhập kết quả, xem <b>Bảng xếp hạng</b> &amp; lịch, xuất BXH ra ảnh/PDF, kết thúc giải.</>,
          <><b>Ủy quyền</b>: Chủ nhiệm có thể cho thành viên cụ thể quyền quản lý giải (nút "Ủy quyền" ở Danh sách giải).</>,
        ]} />
      </>
    ),
  },
  {
    id: 'cham-diem', icon: '⭐', title: 'Chấm điểm thành viên',
    body: (
      <B items={[
        <>Mỗi thành viên bắt đầu 100 điểm; tự trừ theo điểm danh &amp; đóng quỹ, cộng/trừ điều chỉnh thủ công.</>,
        <>Chủ nhiệm: thêm/xóa quy tắc điểm, điều chỉnh cho từng thành viên, chốt kỳ. Thủ quỹ/Thành viên: xem.</>,
      ]} />
    ),
  },
  {
    id: 'he-thong', icon: '⚙️', title: 'Hệ thống & Cài đặt',
    body: (
      <B items={[
        <><b>Thông báo</b>: xem &amp; đánh dấu đã đọc (nhắc đóng quỹ, buổi chơi, cảnh báo). Chuông trên header hiện số chưa đọc.</>,
        <><b>Gói dịch vụ</b>: xem gói &amp; chi phí, nâng cấp gói.</>,
        <><b>Cài đặt</b>: Thông tin CLB · Thương hiệu (logo/màu/tên) · Tài khoản (<b>đổi mật khẩu</b>) · Thanh toán (ngân hàng cho QR) · Telegram.</>,
      ]} />
    ),
  },
  {
    id: 'ai', icon: '🤖', title: 'Trợ lý AI',
    body: (
      <B items={[
        <><b>Lisa</b> — trợ lý cho bạn: hỏi đáp về quỹ, buổi chơi, cách dùng app (bấm Lisa AI góc dưới trái).</>,
        <><b>Maika</b> — phân tích &amp; cảnh báo cho ban quản trị (điểm sức khỏe CLB, báo cáo).</>,
        <><b>AIDO (Văn phòng AI)</b>: xem đội ngũ AI đang làm việc &amp; tổng quan vận hành.</>,
      ]} />
    ),
  },
  {
    id: 'thanh-vien-lam-gi', icon: '🙋', title: 'Nếu bạn là Thành viên',
    body: (
      <B items={[
        <>Xem hồ sơ &amp; số dư; <b>phiếu thu</b> (có mã QR khi còn nợ, xuất PDF); lịch sử đóng quỹ &amp; sao kê.</>,
        <>Tự <b>đăng ký buổi</b> &amp; <b>check-in</b>; xem lịch tham gia, công nợ cá nhân, thông báo.</>,
        <>Xem giải đấu &amp; bảng xếp hạng. Việc thu-chi, tạo giải, quản lý thành viên do ban quản trị thực hiện.</>,
      ]} />
    ),
  },
]

export function UserGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState(SECTIONS[0].id)
  if (!open) return null

  const jump = (id: string) => {
    setActive(id)
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl [background:var(--pf-surface)] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--pf-border)' }}>
          <h2 className="flex items-center gap-2 text-base font-bold [color:var(--pf-text)]">
            <BookOpen size={18} className="text-[color:var(--pf-primary)]" /> Hướng dẫn sử dụng PickleFund
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] hover:[color:var(--pf-text)]" aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Mục lục */}
          <nav className="hidden w-52 shrink-0 overflow-y-auto border-r p-3 sm:block" style={{ borderColor: 'var(--pf-border)' }}>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${active === s.id ? 'text-white [background:var(--pf-primary)]' : '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]'}`}>
                <span>{s.icon}</span> {s.title}
              </button>
            ))}
          </nav>

          {/* Nội dung */}
          <div className="min-w-0 flex-1 overflow-y-auto px-5 py-4">
            {SECTIONS.map((s) => (
              <section key={s.id} id={`guide-${s.id}`} className="mb-6 scroll-mt-2">
                <h3 className="flex items-center gap-2 text-[15px] font-bold [color:var(--pf-text)]"><span>{s.icon}</span> {s.title}</h3>
                <div className="mt-1.5">{s.body}</div>
              </section>
            ))}
            <p className="mt-2 rounded-xl [background:var(--pf-surface-muted)] px-4 py-3 text-xs [color:var(--pf-color-muted)]">
              💡 Cần trợ giúp cụ thể? Mở <b>Lisa AI</b> ở góc dưới bên trái và hỏi trực tiếp — Lisa trả lời theo dữ liệu CLB của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
