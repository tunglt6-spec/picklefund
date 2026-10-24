import { triggerLabel } from '../../hooks/useWorkflows'

/** Mã loại hành động AI → nhãn nghiệp vụ tiếng Việt (workflow:LOW_MEMBER_ATTENDANCE → "Thành viên đi ít"). */
export function humanActionType(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('workflow:')) return triggerLabel(raw.slice('workflow:'.length))
  const t = triggerLabel(raw)
  if (t !== raw) return t
  const s = raw.replace(/^AI_ACTION_/, '').replace(/[_:]/g, ' ').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Mobile (<1024px): hiện nhãn nghiệp vụ; mã kỹ thuật chỉ hiện khi `withCode` (phần chi tiết).
 * Màn lớn giữ nguyên mã gốc như trước.
 */
export function ActionTypeText({ value, withCode }: { value: string; withCode?: boolean }) {
  return (
    <>
      <span className="lg:hidden">{humanActionType(value)}{withCode && humanActionType(value) !== value ? ` (${value})` : ''}</span>
      <span className="max-lg:hidden">{value}</span>
    </>
  )
}
