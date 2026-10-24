import type { ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'

/** In đậm `**…**` trong một dòng; phần còn lại giữ nguyên chữ (không chèn HTML thô). */
function inline(line: string, key: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${key}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>
      : part,
  )
}

/**
 * Hiển thị văn bản AI có dấu markdown cơ bản (**đậm**, gạch đầu dòng, tiêu đề #) thành chữ dễ đọc.
 * Chỉ áp dụng dưới 1024px; màn lớn giữ nguyên văn bản gốc như trước.
 */
export function LightMarkdown({ text }: { text: string }) {
  const compact = useIsMobile(1024)
  if (!compact) return <>{text}</>
  return (
    <>
      {text.split('\n').map((raw, i) => {
        const line = raw.trimEnd()
        if (!line.trim()) return <span key={i} className="block h-2" />
        const head = /^#{1,4}\s+(.*)$/.exec(line)
        if (head) return <span key={i} className="block font-semibold">{inline(head[1], String(i))}</span>
        const li = /^\s*[-*•]\s+(.*)$/.exec(line)
        if (li) return <span key={i} className="flex gap-2"><span aria-hidden>•</span><span className="min-w-0">{inline(li[1], String(i))}</span></span>
        return <span key={i} className="block">{inline(line, String(i))}</span>
      })}
    </>
  )
}
