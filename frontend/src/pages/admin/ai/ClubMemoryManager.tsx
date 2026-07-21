/**
 * Club Memory Manager — CRUD tri thức nền của CLB (Single Source of Truth cho AI).
 * Maika đọc qua OrganizationContextManager (lọc PII/finance trước khi vào context) —
 * xem organization-intelligence.service.ts. Lisa/Hermes CHƯA đọc (việc sau, nếu cần).
 */
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { formatDate } from '../../../lib/utils'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import {
  PageShell, PageHeader, DataTable, MobileCardList, StatusBadge,
  EmptyState, LoadingState, ErrorState, type Column, type StatusTone,
} from '../../../components/shared'

type MemoryType = 'FACT' | 'RULE' | 'PREFERENCE' | 'POLICY' | 'KNOWLEDGE' | 'OPERATIONAL_NOTE'

interface ClubMemory {
  memoryId: string
  clubId: string
  type: MemoryType
  title: string | null
  content: string
  tags: string[]
  metadata: Record<string, unknown>
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

const TYPE_META: Record<MemoryType, { label: string; tone: StatusTone }> = {
  FACT: { label: 'Sự thật', tone: 'info' },
  RULE: { label: 'Quy định', tone: 'danger' },
  PREFERENCE: { label: 'Tuỳ chọn', tone: 'neutral' },
  POLICY: { label: 'Chính sách', tone: 'warning' },
  KNOWLEDGE: { label: 'Tri thức', tone: 'ai' },
  OPERATIONAL_NOTE: { label: 'Ghi chú vận hành', tone: 'success' },
}

const emptyForm = { type: 'POLICY' as MemoryType, title: '', content: '', tagsText: '' }
type FormData = typeof emptyForm

export function ClubMemoryManager() {
  const isMobile = useIsMobile()
  const [items, setItems] = useState<ClubMemory[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [typeFilter, setTypeFilter] = useState<'' | MemoryType>('')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClubMemory | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClubMemory | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoadState('loading')
    api.get('/club-memory')
      .then(res => { setItems(res.data?.data ?? []); setLoadState('idle') })
      .catch(() => setLoadState('error'))
  }
  useEffect(() => { load() }, [])

  const filtered = items.filter(m => {
    if (typeFilter && m.type !== typeFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${m.title ?? ''} ${m.content} ${m.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (m: ClubMemory) => {
    setEditing(m)
    setForm({ type: m.type, title: m.title ?? '', content: m.content, tagsText: m.tags.join(', ') })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.content.trim()) { toast.error('Nội dung không được để trống'); return }
    const tags = form.tagsText.split(',').map(t => t.trim()).filter(Boolean)
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/club-memory/${editing.memoryId}`, {
          title: form.title.trim() || undefined,
          content: form.content.trim(),
          tags,
        })
        toast.success('Đã cập nhật tri thức')
      } else {
        await api.post('/club-memory', {
          type: form.type,
          title: form.title.trim() || undefined,
          content: form.content.trim(),
          tags,
        })
        toast.success('Đã thêm tri thức mới')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/club-memory/${deleteTarget.memoryId}`)
      toast.success('Đã xoá tri thức')
      setDeleteTarget(null)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xoá thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<ClubMemory>[] = [
    {
      key: 'type', header: 'Loại',
      render: m => <StatusBadge tone={TYPE_META[m.type].tone}>{TYPE_META[m.type].label}</StatusBadge>,
    },
    {
      key: 'title', header: 'Tiêu đề / Nội dung',
      render: m => (
        <div className="max-w-md">
          {m.title && <p className="font-medium [color:var(--pf-text)]">{m.title}</p>}
          <p className="text-xs [color:var(--pf-color-muted)] line-clamp-2">{m.content}</p>
        </div>
      ),
    },
    {
      key: 'tags', header: 'Nhãn',
      render: m => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {m.tags.map(t => (
            <span key={t} className="rounded-full px-2 py-0.5 text-[11px] [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]">{t}</span>
          ))}
        </div>
      ),
    },
    { key: 'updatedAt', header: 'Cập nhật', render: m => <span className="text-xs [color:var(--pf-color-muted)]">{formatDate(m.updatedAt)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: m => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:[background:var(--pf-color-muted-soft)]" aria-label="Sửa"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" aria-label="Xoá"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <PageShell maxWidth={1200}>
      <PageHeader
        title="Club Memory"
        subtitle="Tri thức nền của CLB — nguồn tham chiếu chung cho AI (Maika)"
        actions={
          <Button onClick={openCreate}><Plus size={14} />Thêm tri thức</Button>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, nhãn..."
            className="input-base text-sm max-w-xs"
          />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as '' | MemoryType)} className="input-base text-sm w-auto">
            <option value="">Tất cả loại</option>
            {(Object.keys(TYPE_META) as MemoryType[]).map(t => (
              <option key={t} value={t}>{TYPE_META[t].label}</option>
            ))}
          </select>
        </div>

        {loadState === 'loading' ? (
          <LoadingState />
        ) : loadState === 'error' ? (
          <ErrorState onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title={items.length === 0 ? 'Chưa có tri thức nào' : 'Không tìm thấy kết quả'}
            description={items.length === 0 ? 'Thêm quy định, chính sách, ghi chú vận hành để AI (Maika) có ngữ cảnh CLB.' : 'Thử đổi từ khoá hoặc bộ lọc.'}
            action={items.length === 0 ? <Button onClick={openCreate}><Plus size={14} />Thêm tri thức đầu tiên</Button> : undefined}
          />
        ) : isMobile ? (
          <MobileCardList
            items={filtered}
            itemKey={m => m.memoryId}
            renderCard={m => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusBadge tone={TYPE_META[m.type].tone}>{TYPE_META[m.type].label}</StatusBadge>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:[background:var(--pf-color-muted-soft)]" aria-label="Sửa"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" aria-label="Xoá"><Trash2 size={14} /></button>
                  </div>
                </div>
                {m.title && <p className="font-medium text-sm [color:var(--pf-text)]">{m.title}</p>}
                <p className="text-xs [color:var(--pf-color-muted)] line-clamp-3">{m.content}</p>
                {m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.tags.map(t => <span key={t} className="rounded-full px-2 py-0.5 text-[11px] [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]">{t}</span>)}
                  </div>
                )}
                <p className="text-[11px] [color:var(--pf-color-muted)]">Cập nhật {formatDate(m.updatedAt)}</p>
              </div>
            )}
          />
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={m => m.memoryId} />
        )}
      </div>

      {/* Form tạo/sửa */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Sửa tri thức' : 'Thêm tri thức mới'}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Huỷ</Button>
            <Button disabled={saving} onClick={handleSubmit}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại tri thức</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as MemoryType }))}
              disabled={!!editing}
              className="input-base"
            >
              {(Object.keys(TYPE_META) as MemoryType[]).map(t => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
            {editing && <p className="text-xs text-slate-400 mt-1">Không đổi được loại sau khi tạo — tạo mới nếu cần loại khác.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tiêu đề (không bắt buộc)</label>
            <input
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input-base" placeholder="VD: Quy định điểm danh"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung <span className="text-red-500">*</span></label>
            <textarea
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={6} className="input-base resize-y"
              placeholder="VD: Thành viên vắng quá 50% buổi trong kỳ sẽ được nhắc nhở qua Lisa..."
            />
            <p className="text-xs text-slate-400 mt-1">Không nhập số liệu tài chính/PII cụ thể — hệ thống sẽ tự lọc trước khi đưa vào ngữ cảnh AI, nhưng tốt nhất nên tránh từ đầu.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nhãn (phân tách bằng dấu phẩy)</label>
            <input
              value={form.tagsText} onChange={e => setForm(f => ({ ...f, tagsText: e.target.value }))}
              className="input-base" placeholder="VD: điểm danh, vận hành"
            />
          </div>
        </div>
      </Modal>

      {/* Confirm xoá */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xoá tri thức?"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="danger" disabled={deleting} onClick={handleDelete}>{deleting ? 'Đang xoá...' : 'Xoá'}</Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Xoá {deleteTarget?.title ? `"${deleteTarget.title}"` : 'mục tri thức này'}? Hành động không thể hoàn tác.
        </p>
      </Modal>
    </PageShell>
  )
}
