/**
 * /roi — Máy tính ước lượng lợi ích (ROI). Tính TOÀN BỘ trên số liệu người dùng tự nhập,
 * kể cả "mức tự động hóa ước tính" → con số là ước tính theo giả định của chính họ, KHÔNG phải
 * cam kết/kết quả đảm bảo. Có ghi chú rõ đây là ước tính.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Clock, CalendarRange, Coins, Info, ArrowRight } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

function Field({
  label, value, onChange, min, max, step, suffix,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-semibold [color:var(--pf-text)]">{label}</label>
        <span className="text-[13px] font-bold [color:var(--pf-primary)]">
          {value.toLocaleString('vi-VN')}{suffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-[var(--pf-primary)]"
      />
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-extrabold tracking-tight [color:var(--pf-text)]">{value}</p>
      <p className="mt-0.5 text-[12px] [color:var(--pf-color-muted)]">{label}</p>
    </div>
  )
}

export function RoiCalculator() {
  const [members, setMembers] = useState(30)
  const [manualHours, setManualHours] = useState(15) // giờ quản lý thủ công / tháng
  const [autoRate, setAutoRate] = useState(50) // % công việc lặp lại ước tính giảm được
  const [hourValue, setHourValue] = useState(50000) // giá trị 1 giờ công (đ), tùy chọn

  const r = useMemo(() => {
    const savedPerMonth = manualHours * (autoRate / 100)
    const savedPerYear = savedPerMonth * 12
    const moneyPerYear = savedPerYear * hourValue
    return { savedPerMonth, savedPerYear, moneyPerYear }
  }, [manualHours, autoRate, hourValue])

  const fmtH = (h: number) => `${h.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`
  const fmtMoney = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`

  return (
    <PublicPage title="Máy tính ROI">
      <PageHero
        eyebrow="Công cụ · ROI"
        title="Ước lượng thời gian & chi phí tiết kiệm"
        desc="Kéo các thanh dưới đây theo tình hình CLB của bạn. Kết quả là ước tính dựa trên số liệu và giả định bạn nhập — không phải cam kết."
      />

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Inputs */}
          <div className="rounded-3xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
            <div className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]">
              <Calculator size={14} /> Thông số CLB của bạn
            </div>
            <div className="space-y-6">
              <Field label="Số thành viên" value={members} onChange={setMembers} min={5} max={500} step={5} suffix="người" />
              <Field label="Giờ quản lý thủ công / tháng" value={manualHours} onChange={setManualHours} min={1} max={80} step={1} suffix="giờ" />
              <Field label="Mức tự động hóa ước tính" value={autoRate} onChange={setAutoRate} min={10} max={80} step={5} suffix="%" />
              <Field label="Giá trị 1 giờ công (tùy chọn)" value={hourValue} onChange={setHourValue} min={0} max={300000} step={10000} suffix="đ" />
            </div>
            <p className="mt-5 flex items-start gap-2 rounded-xl border p-3 text-[12px] leading-relaxed [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">
              <Info size={14} className="mt-0.5 shrink-0" />
              "Mức tự động hóa" là ước lượng phần công việc lặp lại (nhập liệu, tổng hợp, nhắc việc, chia chi phí) có thể giảm nhờ số hóa. Bạn tự điều chỉnh theo thực tế CLB.
            </p>
          </div>

          {/* Kết quả */}
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat icon={Clock} label="Tiết kiệm mỗi tháng (ước tính)" value={fmtH(r.savedPerMonth)} tone="var(--pf-primary)" />
              <Stat icon={CalendarRange} label="Tiết kiệm mỗi năm (ước tính)" value={fmtH(r.savedPerYear)} tone="var(--pf-color-info)" />
            </div>
            <div className="mt-4">
              <Stat
                icon={Coins}
                label={hourValue > 0 ? 'Quy đổi giá trị / năm (ước tính)' : 'Nhập giá trị giờ công để quy đổi tiền'}
                value={hourValue > 0 ? fmtMoney(r.moneyPerYear) : '—'}
                tone="var(--pf-green)"
              />
            </div>

            <div className="mt-6 rounded-2xl border p-6 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
              <p className="text-[15px] font-bold [color:var(--pf-text)]">Con số này đến từ đâu?</p>
              <p className="mt-1.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
                Giờ tiết kiệm = (giờ thủ công/tháng) × (mức tự động hóa). Quy đổi tiền = giờ tiết kiệm × giá trị giờ công. Tất cả tham số do bạn nhập, nên kết quả phản ánh đúng giả định của bạn — hãy xem đây là công cụ tham khảo, không phải kết quả đảm bảo.
              </p>
              <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
                Bắt đầu miễn phí <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
