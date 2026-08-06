/**
 * /resources/faq — Câu hỏi thường gặp (accordion). Dùng FAQS thật từ landing-content + nhóm
 * thêm câu về giá & bảo mật. Dùng <details> native → accessible, không cần JS.
 */
import { ChevronDown } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'
import { FAQS } from '../landing-content'

const GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  { title: 'Tổng quan & sản phẩm', items: FAQS },
  {
    title: 'Giá & thanh toán',
    items: [
      { q: 'PickleFund có gói miễn phí không?', a: 'Có. Gói Starter miễn phí đủ để một CLB nhỏ bắt đầu quản lý thành viên, thu/chi và hoạt động. Bạn nâng cấp lên Pro/Enterprise khi cần thêm giới hạn và tính năng.' },
      { q: 'Nâng cấp gói như thế nào?', a: 'Bạn nâng cấp trực tiếp trong app (mục Gói dịch vụ). Gói hiệu lực gắn với thời hạn; hết hạn có thời gian ân hạn trước khi tự hạ gói.' },
      { q: 'Có hoàn tiền không?', a: 'Chính sách hoàn tiền chi tiết sẽ được công bố tại trang Pháp lý. Trước khi trả phí, bạn có thể dùng thử miễn phí để đánh giá.' },
    ],
  },
  {
    title: 'Bảo mật & dữ liệu',
    items: [
      { q: 'Dữ liệu của CLB tôi có riêng tư không?', a: 'Có. Dữ liệu được phân tách theo từng CLB (multi-tenant) và kiểm soát truy cập theo vai trò — mỗi CLB chỉ thấy dữ liệu của mình.' },
      { q: 'AI có tự ý thao tác tiền bạc không?', a: 'Không. Mọi hành động quan trọng (đặc biệt liên quan tài chính) đều cần con người phê duyệt. AI hỗ trợ phân tích và thực thi tác vụ lặp lại, không tự quyết.' },
      { q: 'Dữ liệu có được sao lưu không?', a: 'Hệ thống sao lưu định kỳ. Các cam kết chi tiết về sao lưu/uptime sẽ được công bố tại Trung tâm Tin cậy (Trust Center) trong phiên bản kế tiếp.' },
    ],
  },
]

function Item({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b [border-color:var(--pf-border)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-semibold [color:var(--pf-text)] marker:hidden">
        {q}
        <ChevronDown size={18} className="shrink-0 [color:var(--pf-color-muted)] transition-transform group-open:rotate-180" />
      </summary>
      <p className="pb-4 pr-8 text-sm leading-relaxed [color:var(--pf-color-muted)]">{a}</p>
    </details>
  )
}

export function Faq() {
  return (
    <PublicPage title="Câu hỏi thường gặp">
      <PageHero
        eyebrow="Tài nguyên · FAQ"
        title="Câu hỏi thường gặp"
        desc="Giải đáp nhanh về sản phẩm, giá, bảo mật và triển khai. Chưa thấy câu trả lời? Liên hệ đội ngũ hỗ trợ."
      />
      <section className={`${PUBLIC_CONTAINER} py-14`}>
        <div className="mx-auto max-w-3xl space-y-10">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="mb-2 text-lg font-extrabold tracking-tight">{g.title}</h2>
              <div className="rounded-2xl border px-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
                {g.items.map((it) => <Item key={it.q} q={it.q} a={it.a} />)}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border p-6 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
            <p className="text-[15px] font-bold">Vẫn còn thắc mắc?</p>
            <p className="mt-1 text-sm [color:var(--pf-color-muted)]">Đội ngũ hỗ trợ sẵn sàng đồng hành cùng bạn.</p>
            <a href="/contact" className="mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>Liên hệ hỗ trợ</a>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
