import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center [background:var(--pf-bg)]">
      <div className="text-center">
        <p className="text-8xl font-extrabold [color:var(--pf-primary)] opacity-90">404</p>
        <h1 className="text-2xl font-bold [color:var(--pf-text)] mt-4">Trang không tồn tại</h1>
        <p className="[color:var(--pf-color-muted)] mt-2">Trang bạn đang tìm không có hoặc đã bị di chuyển.</p>
        <Button className="mt-6" onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    </div>
  )
}
