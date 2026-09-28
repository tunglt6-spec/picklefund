/**
 * @deprecated Shim tương thích — implementation đã gộp về `components/shared/PageHeader`.
 * Đây là kiểu app-bar (viền dưới) = shared PageHeader `variant="bar"`. 17 màn cũ import từ
 * đây vẫn render Y HỆT. Khi rảnh nên đổi import sang shared + thêm variant="bar" rồi xoá file này.
 */
import type { ReactNode } from 'react'
import { PageHeader as SharedPageHeader } from '../shared/PageHeader'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return <SharedPageHeader title={title} subtitle={subtitle} actions={actions} variant="bar" />
}
