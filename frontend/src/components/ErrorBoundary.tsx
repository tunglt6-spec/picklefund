/**
 * ErrorBoundary — "lưới an toàn" cho toàn app.
 *
 * VÌ SAO CẦN: React chỉ có class component mới bắt được lỗi render (getDerivedStateFromError /
 * componentDidCatch). Trước đây app KHÔNG có ErrorBoundary → bất kỳ lỗi runtime nào ở 1 màn (hoặc
 * lỗi tải "chunk" lazy sau khi deploy) đều làm SẬP & TRẮNG toàn bộ ứng dụng, không có cách phục hồi.
 *
 * CÁCH HOẠT ĐỘNG:
 *  - Bọc quanh <Routes>. Khi 1 màn ném lỗi → thay vì trắng màn, hiện thông báo + nút "Tải lại trang".
 *  - Nếu lỗi là do tải chunk (thường do Service Worker/bundle cũ sau deploy) → TỰ tải lại 1 lần
 *    (chặn lặp bằng sessionStorage 65s) để lấy bản mới; trong lúc chờ hiện "Đang cập nhật…"
 *    kèm nút thoát sau 4 giây (không kẹt cứng nếu auto-reload không xảy ra).
 *  - Tự reset khi người dùng ĐỔI route (đổi `resetKey`) → không kẹt màn lỗi khi chuyển trang.
 */
import { Component, useEffect, useState, type ReactNode } from 'react'

/** Nhận diện lỗi tải chunk lazy (import động thất bại/treo) — phân biệt với lỗi logic thường. */
function laLoiTaiChunk(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')) || ''
  return /CHUNK_TIMEOUT|dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(
    msg,
  )
}

/**
 * Tự tải lại 1 lần — dùng chung khoá + cửa sổ throttle 65s với helper lz trong App.tsx.
 * 65s PHẢI DÀI HƠN chu kỳ "chunk treo" (timeout 20s + thời gian load) — nếu ngắn hơn,
 * mạng treo lặp sẽ thành vòng reload vô hạn (audit FE-H1).
 */
function taiLaiLayBanMoi() {
  try {
    const KEY = 'pf_chunk_reload_at'
    const last = Number(sessionStorage.getItem(KEY) || '0')
    if (Date.now() - last > 65_000) {
      sessionStorage.setItem(KEY, String(Date.now()))
      window.location.reload()
    }
  } catch {
    /* sessionStorage bị chặn (chế độ riêng tư…) → bỏ qua */
  }
}

interface Props {
  children: ReactNode
  /** Đổi giá trị này (vd theo pathname) để tự reset trạng thái lỗi khi chuyển trang. */
  resetKey?: string
}
interface State {
  coLoi: boolean
  laChunk: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { coLoi: false, laChunk: false }

  static getDerivedStateFromError(err: unknown): State {
    return { coLoi: true, laChunk: laLoiTaiChunk(err) }
  }

  componentDidCatch(err: unknown) {
    // Lỗi tải chunk sau deploy → tự tải lại 1 lần để lấy bundle mới.
    if (laLoiTaiChunk(err)) taiLaiLayBanMoi()
    // (Có thể gắn gửi log lỗi về server tại đây nếu cần theo dõi.)
  }

  componentDidUpdate(prev: Props) {
    // Người dùng chuyển route → xoá trạng thái lỗi để thử render màn mới.
    if (this.state.coLoi && prev.resetKey !== this.props.resetKey) {
      this.setState({ coLoi: false, laChunk: false })
    }
  }

  render() {
    if (!this.state.coLoi) return this.props.children

    // Lỗi chunk: thường tự tải lại ngay. NHƯNG nếu auto-reload không xảy ra (bị throttle
    // sau lần reload trước / sessionStorage bị chặn / deploy hỏng thật) thì KHÔNG được kẹt
    // cứng — hiện nút thoát sau 4 giây (audit FE-H2; PWA standalone không có nút refresh).
    if (this.state.laChunk) {
      return (
        <ManHinhLoi
          tieuDe="Đang cập nhật phiên bản mới…"
          moTa="Ứng dụng đang tải lại để lấy bản mới nhất. Nếu chờ lâu, hãy bấm Tải lại trang."
          hienNut="tre"
        />
      )
    }

    return (
      <ManHinhLoi
        tieuDe="Đã xảy ra lỗi hiển thị"
        moTa="Xin lỗi vì sự cố. Vui lòng tải lại trang; nếu vẫn lỗi, hãy quay về trang chủ."
        hienNut
      />
    )
  }
}

/**
 * Màn thông báo lỗi thân thiện (tiếng Việt) — dùng token màu chung của app, tự hợp light/dark.
 * hienNut: true = hiện nút ngay; 'tre' = hiện sau 4 giây (chờ auto-reload trước, không kẹt cứng).
 */
function ManHinhLoi({
  tieuDe,
  moTa,
  hienNut,
}: {
  tieuDe: string
  moTa: string
  hienNut: boolean | 'tre'
}) {
  const [hien, setHien] = useState(hienNut === true)
  useEffect(() => {
    if (hienNut !== 'tre') return
    const t = setTimeout(() => setHien(true), 4_000)
    return () => clearTimeout(t)
  }, [hienNut])
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: 'var(--pf-bg, var(--pf-surface-muted))', color: 'var(--pf-text, #1e293b)' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{ background: 'var(--pf-primary-soft, #eef2ff)', color: 'var(--pf-primary, #6D5DFB)' }}
      >
        ⚠️
      </div>
      <h1 className="text-lg font-bold">{tieuDe}</h1>
      <p className="max-w-sm text-sm" style={{ color: 'var(--pf-color-muted, var(--pf-color-muted))' }}>
        {moTa}
      </p>
      {hien && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--pf-primary, #6D5DFB)' }}
          >
            Tải lại trang
          </button>
          <button
            onClick={() => {
              window.location.href = '/'
            }}
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--pf-border, var(--pf-border))', color: 'var(--pf-text, #1e293b)' }}
          >
            Về trang chủ
          </button>
        </div>
      )}
    </div>
  )
}
