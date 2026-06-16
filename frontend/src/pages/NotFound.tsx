import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-8xl font-bold text-indigo-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Trang không tồn tại</h1>
        <p className="text-gray-500 mt-2">Trang bạn đang tìm không có hoặc đã bị di chuyển.</p>
        <Button className="mt-6" onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    </div>
  )
}
