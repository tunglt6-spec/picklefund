/**
 * MemberCommunity — "Cộng đồng CLB" (Community v1).
 * Hai tab: "Bảng tin" (feed) và "Tìm kèo" (matchmaking).
 * Mobile-first (375px), token-based (--pf-*), không chat/DM.
 *
 * File độc lập theo yêu cầu: mọi subcomponent nằm trong file này.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  MessageCircle,
  Send,
  ImagePlus,
  AtSign,
  Plus,
  Trash2,
  Pencil,
  Flag,
  Clock,
  CalendarDays,
  Users,
  X,
  Loader2,
  Check,
  Search,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  PageShell,
  PageHeader,
  EmptyState,
  LoadingState,
  ErrorState,
  StatusBadge,
  ActionButton,
  ResponsiveTabs,
} from '../../components/shared'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

/* ────────────────────────────── Types ────────────────────────────── */

type ReactionEmoji = 'THUMBS_UP' | 'HEART' | 'CLAP' | 'FIRE'
type PostKind = 'GENERAL' | 'SESSION' | 'TOURNAMENT'
type MatchStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'CANCELLED'

interface AuthorLite {
  id: string
  fullName: string
  avatarUrl: string | null
}

interface ReactionSummary {
  counts: Record<ReactionEmoji, number>
  mine: ReactionEmoji | null
  total: number
}

interface Post {
  id: string
  kind: PostKind
  body: string
  imageUrl: string | null
  sessionId: string | null
  minigameId: string | null
  author: AuthorLite
  commentCount: number
  reactions: ReactionSummary
  createdAt: string
  updatedAt: string
  canEdit: boolean
  canDelete: boolean
}

interface Comment {
  id: string
  body: string
  author: AuthorLite
  reactions: ReactionSummary
  createdAt: string
  updatedAt: string
  canEdit: boolean
  canDelete: boolean
}

interface FeedResponse {
  items: Post[]
  nextCursor: string | null
}

interface MentionMember {
  id: string
  fullName: string
  avatarUrl: string | null
}

interface Match {
  id: string
  sport: string
  playDate: string
  startTime: string | null
  endTime: string | null
  format: string | null
  neededCount: number
  skillLevel: number | null
  note: string | null
  status: MatchStatus
  creator: AuthorLite
  joinedCount: number
  remaining: number
  participants: AuthorLite[]
  isCreator: boolean
  isJoined: boolean
}

type TabKey = 'feed' | 'matchmaking'

/* ────────────────────────────── Constants ────────────────────────────── */

const REACTIONS: { key: ReactionEmoji; emoji: string; label: string }[] = [
  { key: 'THUMBS_UP', emoji: '👍', label: 'Thích' },
  { key: 'HEART', emoji: '❤️', label: 'Yêu thích' },
  { key: 'CLAP', emoji: '👏', label: 'Vỗ tay' },
  { key: 'FIRE', emoji: '🔥', label: 'Tuyệt vời' },
]

/* ────────────────────────────── Helpers ────────────────────────────── */

/** Đọc envelope { success, data } hoặc data trần. */
function unwrap<T>(res: { data?: unknown }): T {
  const raw = res.data as { data?: unknown } | undefined
  return (raw?.data ?? res.data) as T
}

function apiMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? fallback
}

/** Chuẩn hoá URL ảnh: path cũ '/uploads/…' → '/api/uploads/…' (nginx chỉ proxy '/api'). */
function mediaUrl(u: string | null | undefined): string {
  if (!u) return ''
  return u.startsWith('/uploads/') ? `/api${u}` : u
}

/** "Vừa xong" / "5 phút trước" / "2 giờ trước" / "3 ngày trước" / dd/mm/yyyy. */
function timeAgo(dateStr: string): string {
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const s = Math.floor(diff / 1000)
  if (s < 45) return 'Vừa xong'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function formatPlayDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) return `${start} - ${end}`
  return start ?? end
}

/** Tính optimistic khi bấm 1 emoji (toggle/switch/add). */
function computeReaction(cur: ReactionSummary, emoji: ReactionEmoji): ReactionSummary {
  const counts = { ...cur.counts }
  let mine = cur.mine
  let total = cur.total
  if (cur.mine === emoji) {
    counts[emoji] = Math.max(0, counts[emoji] - 1)
    total = Math.max(0, total - 1)
    mine = null
  } else if (cur.mine) {
    counts[cur.mine] = Math.max(0, counts[cur.mine] - 1)
    counts[emoji] = counts[emoji] + 1
    mine = emoji
  } else {
    counts[emoji] = counts[emoji] + 1
    total = total + 1
    mine = emoji
  }
  return { counts, mine, total }
}

const AVATAR_COLORS = [
  '#6D5DFB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/* ────────────────────────────── Avatar ────────────────────────────── */

function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const dim = { width: size, height: size, minWidth: size }
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={dim}
        className="shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <span
      style={{ ...dim, background: colorFor(name), fontSize: Math.round(size * 0.4) }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/* ────────────────────────────── ReactionBar ────────────────────────────── */

function ReactionBar({
  reactions,
  onReact,
  disabled,
}: {
  reactions: ReactionSummary
  onReact: (emoji: ReactionEmoji) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((r) => {
        const count = reactions.counts[r.key] ?? 0
        const active = reactions.mine === r.key
        return (
          <button
            key={r.key}
            type="button"
            disabled={disabled}
            onClick={() => onReact(r.key)}
            aria-label={r.label}
            aria-pressed={active}
            className={[
              'inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all active:scale-[0.96] disabled:opacity-50',
              active
                ? '[border-color:var(--pf-primary-soft)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                : 'border-[color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-color-muted)] hover:[border-color:var(--pf-primary-soft)]',
            ].join(' ')}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ────────────────────────────── Mention picker ────────────────────────────── */

function MentionPicker({
  members,
  query,
  onQueryChange,
  onPick,
  onClose,
}: {
  members: MentionMember[]
  query: string
  onQueryChange: (v: string) => void
  onPick: (m: MentionMember) => void
  onClose: () => void
}) {
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase()
    const list = t ? members.filter((m) => m.fullName.toLowerCase().includes(t)) : members
    return list.slice(0, 30)
  }, [query, members])

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-surface)] shadow-[var(--pf-shadow)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--pf-border)] px-3 py-2">
        <Search size={14} className="[color:var(--pf-color-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Tìm thành viên để gắn thẻ…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)]"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-9 w-9 items-center justify-center rounded-md [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]"
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {members.length === 0 ? (
          <p className="px-3 py-3 text-xs [color:var(--pf-color-muted)]">Chưa tải được danh sách thành viên.</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-3 text-xs [color:var(--pf-color-muted)]">Không tìm thấy thành viên.</p>
        ) : (
          filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m)}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:[background:var(--pf-color-muted-soft)]"
            >
              <Avatar name={m.fullName} url={m.avatarUrl} size={28} />
              <span className="truncate text-sm [color:var(--pf-text)]">{m.fullName}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────── Composer ────────────────────────────── */

function Composer({
  members,
  authorName,
  authorUrl,
  onCreated,
}: {
  members: MentionMember[]
  authorName: string
  authorUrl: string | null
  onCreated: (p: Post) => void
}) {
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showMention, setShowMention] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentions, setMentions] = useState<MentionMember[]>([])
  const [submitting, setSubmitting] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Gõ "@..." trong ô nhập → tự mở danh sách thành viên (lọc theo chữ đã gõ).
  const onBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setBody(val)
    const pos = e.target.selectionStart ?? val.length
    const m = val.slice(0, pos).match(/(?:^|\s)@([\p{L}\d._]*)$/u)
    if (m) {
      setShowMention(true)
      setMentionQuery(m[1])
    } else {
      setShowMention(false)
    }
  }

  // Chèn thẻ: thay token "@..." đang gõ (nếu có) bằng "@Họ Tên " + ghi nhận id.
  const insertMention = (m: MentionMember) => {
    const ta = taRef.current
    const pos = ta?.selectionStart ?? body.length
    const pre = body.slice(0, pos)
    const tokenMatch = pre.match(/@([\p{L}\d._]*)$/u)
    const newPre = tokenMatch
      ? pre.slice(0, pre.length - tokenMatch[0].length) + `@${m.fullName} `
      : (pre && !pre.endsWith(' ') ? pre + ' ' : pre) + `@${m.fullName} `
    const newBody = newPre + body.slice(pos)
    setBody(newBody)
    setMentions((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    setShowMention(false)
    setMentionQuery('')
    setTimeout(() => {
      ta?.focus()
      ta?.setSelectionRange(newPre.length, newPre.length)
    }, 0)
  }

  const removeMention = (id: string) => setMentions((prev) => prev.filter((m) => m.id !== id))

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/community/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const d = unwrap<{ url: string }>(res)
      setImageUrl(d.url)
    } catch (err) {
      toast.error(apiMessage(err, 'Tải ảnh thất bại — thử lại'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const reset = () => {
    setBody('')
    setImageUrl('')
    setShowMention(false)
    setMentionQuery('')
    setMentions([])
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text || submitting || uploading) return
    // CHỐT lại thẻ: chỉ giữ những mention mà "@Họ Tên" còn trong nội dung (tránh gắn nhầm khi đã xóa chữ).
    const finalMentions = mentions.filter((m) => text.includes(`@${m.fullName}`)).map((m) => m.id)
    setSubmitting(true)
    try {
      const res = await api.post('/community/posts', {
        body: text,
        kind: 'GENERAL',
        imageUrl: imageUrl || undefined,
        mentions: finalMentions.length ? finalMentions : undefined,
      })
      onCreated(unwrap<Post>(res))
      reset()
      toast.success('Đã đăng bài')
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể đăng bài — thử lại'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[color:var(--pf-border)] [background:var(--pf-surface)] p-4"
    >
      <div className="flex gap-3">
        <Avatar name={authorName} url={authorUrl} size={40} />
        <div className="min-w-0 flex-1">
          <textarea
            ref={taRef}
            value={body}
            onChange={onBodyChange}
            aria-label="Nội dung bài đăng cộng đồng"
            placeholder="Chia sẻ với cộng đồng CLB…  (gõ @ để gắn thẻ thành viên)"
            rows={3}
            className="w-full resize-none rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-bg)] px-3 py-2 text-sm outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)] focus:[border-color:var(--pf-primary-soft)]"
          />

          {/* Thẻ thành viên đã gắn — xác nhận trực quan "đã tag" */}
          {mentions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mentions.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                  @{m.fullName}
                  <button type="button" aria-label={`Bỏ thẻ ${m.fullName}`} onClick={() => removeMention(m.id)} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:[background:var(--pf-primary)] hover:[color:var(--pf-primary-on)]">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Ảnh: upload file → hiện ảnh (không dán URL) */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          {uploading && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><Loader2 size={14} className="animate-spin" /> Đang tải ảnh…</div>
          )}
          {imageUrl && !uploading && (
            <div className="relative mt-2 inline-block">
              <img src={mediaUrl(imageUrl)} alt="Ảnh đính kèm" className="max-h-64 max-w-full rounded-xl border border-[color:var(--pf-border)] object-cover" />
              <button type="button" aria-label="Gỡ ảnh" onClick={() => setImageUrl('')}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80">
                <X size={15} />
              </button>
            </div>
          )}

          {showMention && (
            <MentionPicker
              members={members}
              query={mentionQuery}
              onQueryChange={setMentionQuery}
              onPick={insertMention}
              onClose={() => setShowMention(false)}
            />
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setShowMention((v) => !v); setMentionQuery('') }}
                aria-label="Gắn thẻ thành viên"
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                  showMention
                    ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                    : '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]',
                ].join(' ')}
              >
                <AtSign size={18} />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Thêm hình ảnh"
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-50',
                  imageUrl
                    ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                    : '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]',
                ].join(' ')}
              >
                <ImagePlus size={18} />
              </button>
            </div>
            <ActionButton
              type="submit"
              variant="primary"
              disabled={!body.trim() || submitting || uploading}
              className="min-h-11"
              icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            >
              Đăng
            </ActionButton>
          </div>
        </div>
      </div>
    </form>
  )
}

/* ────────────────────────────── PostCard ────────────────────────────── */

const KIND_BADGE: Record<PostKind, { tone: 'info' | 'ai'; label: string } | null> = {
  GENERAL: null,
  SESSION: { tone: 'info', label: 'Buổi tập' },
  TOURNAMENT: { tone: 'ai', label: 'Giải đấu' },
}

/** Tô sáng "@Họ Tên" (khớp danh sách thành viên) thành thẻ trong nội dung đã đăng. */
function renderWithMentions(text: string, members: MentionMember[]): ReactNode {
  if (!members.length || !text.includes('@')) return text
  const names = members.map((m) => m.fullName).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!names.length) return text
  const esc = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`@(?:${esc.join('|')})`, 'g')
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <span key={key++} className="rounded px-1 font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function PostCard({
  post,
  members,
  highlight,
  onChange,
  onDelete,
}: {
  post: Post
  members: MentionMember[]
  highlight: boolean
  onChange: (p: Post) => void
  onDelete: (id: string) => void
}) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [cmtMentions, setCmtMentions] = useState<MentionMember[]>([])
  const [showCmtMention, setShowCmtMention] = useState(false)
  const [cmtMentionQuery, setCmtMentionQuery] = useState('')
  const cmtInputRef = useRef<HTMLInputElement>(null)

  const [editingPost, setEditingPost] = useState(false)
  const [editBody, setEditBody] = useState(post.body)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [confirmReport, setConfirmReport] = useState(false)

  const reportPost = async () => {
    setConfirmReport(false)
    try {
      const res = await api.post('/community/report', { targetType: 'POST', targetId: post.id })
      const r = unwrap<{ duplicate?: boolean }>(res)
      toast.success(r?.duplicate ? 'Bạn đã báo cáo bài này trước đó' : 'Đã gửi báo cáo cho quản trị viên')
    } catch (err) {
      toast.error(apiMessage(err, 'Không gửi được báo cáo'))
    }
  }

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentBody, setEditCommentBody] = useState('')
  const [confirmDelComment, setConfirmDelComment] = useState<string | null>(null)

  const badge = KIND_BADGE[post.kind]

  const loadComments = useCallback(async () => {
    if (commentsLoaded) return
    setLoadingComments(true)
    try {
      const res = await api.get(`/community/posts/${post.id}/comments`)
      setComments(unwrap<Comment[]>(res) ?? [])
      setCommentsLoaded(true)
    } catch (err) {
      toast.error(apiMessage(err, 'Không tải được bình luận'))
    } finally {
      setLoadingComments(false)
    }
  }, [post.id, commentsLoaded])

  const toggleComments = () => {
    const next = !commentsOpen
    setCommentsOpen(next)
    if (next) void loadComments()
  }

  /* reactions */
  const reactPost = async (emoji: ReactionEmoji) => {
    const cur = post.reactions
    const send = cur.mine === emoji ? null : emoji
    onChange({ ...post, reactions: computeReaction(cur, emoji) })
    try {
      const res = await api.put('/community/reactions', {
        targetType: 'POST',
        targetId: post.id,
        emoji: send,
      })
      onChange({ ...post, reactions: unwrap<ReactionSummary>(res) })
    } catch {
      onChange({ ...post, reactions: cur })
      toast.error('Không thể cập nhật cảm xúc')
    }
  }

  const reactComment = async (commentId: string, emoji: ReactionEmoji) => {
    const target = comments.find((c) => c.id === commentId)
    if (!target) return
    const cur = target.reactions
    const send = cur.mine === emoji ? null : emoji
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, reactions: computeReaction(cur, emoji) } : c)),
    )
    try {
      const res = await api.put('/community/reactions', {
        targetType: 'COMMENT',
        targetId: commentId,
        emoji: send,
      })
      const summary = unwrap<ReactionSummary>(res)
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, reactions: summary } : c)))
    } catch {
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, reactions: cur } : c)))
      toast.error('Không thể cập nhật cảm xúc')
    }
  }

  /* @mention trong ô bình luận: gõ "@" → mở danh sách; chọn để gắn thẻ */
  const onCmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNewComment(val)
    const pos = e.target.selectionStart ?? val.length
    const m = val.slice(0, pos).match(/(?:^|\s)@([\p{L}\d._]*)$/u)
    if (m) { setShowCmtMention(true); setCmtMentionQuery(m[1]) }
    else setShowCmtMention(false)
  }
  const insertCmtMention = (mem: MentionMember) => {
    const el = cmtInputRef.current
    const pos = el?.selectionStart ?? newComment.length
    const pre = newComment.slice(0, pos)
    const tok = pre.match(/@([\p{L}\d._]*)$/u)
    const newPre = tok
      ? pre.slice(0, pre.length - tok[0].length) + `@${mem.fullName} `
      : (pre && !pre.endsWith(' ') ? pre + ' ' : pre) + `@${mem.fullName} `
    setNewComment(newPre + newComment.slice(pos))
    setCmtMentions((p) => (p.some((x) => x.id === mem.id) ? p : [...p, mem]))
    setShowCmtMention(false)
    setCmtMentionQuery('')
    setTimeout(() => el?.focus(), 0)
  }

  /* add comment */
  const submitComment = async (e: FormEvent) => {
    e.preventDefault()
    const text = newComment.trim()
    if (!text || addingComment) return
    const finalMentions = cmtMentions.filter((m) => text.includes(`@${m.fullName}`)).map((m) => m.id)
    setAddingComment(true)
    try {
      const res = await api.post(`/community/posts/${post.id}/comments`, {
        body: text,
        mentions: finalMentions.length ? finalMentions : undefined,
      })
      const created = unwrap<Comment>(res)
      setComments((prev) => [...prev, created])
      setCommentsLoaded(true)
      setNewComment('')
      setCmtMentions([])
      setShowCmtMention(false)
      onChange({ ...post, commentCount: post.commentCount + 1 })
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể gửi bình luận'))
    } finally {
      setAddingComment(false)
    }
  }

  /* edit post */
  const saveEdit = async () => {
    const text = editBody.trim()
    if (!text || savingEdit) return
    setSavingEdit(true)
    try {
      const res = await api.patch(`/community/posts/${post.id}`, { body: text })
      // Backend trả object MỘT PHẦN (id/body/imageUrl/updatedAt) → merge vào post đầy đủ
      // để không mất author/reactions/commentCount (tránh crash render).
      onChange({ ...post, ...unwrap<Partial<Post>>(res) })
      setEditingPost(false)
      toast.success('Đã cập nhật bài viết')
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể cập nhật'))
    } finally {
      setSavingEdit(false)
    }
  }

  /* delete post */
  const doDelete = async () => {
    try {
      await api.delete(`/community/posts/${post.id}`)
      onDelete(post.id)
      toast.success('Đã xoá bài viết')
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể xoá bài viết'))
    } finally {
      setConfirmDel(false)
    }
  }

  /* edit / delete comment */
  const saveCommentEdit = async (commentId: string) => {
    const text = editCommentBody.trim()
    if (!text) return
    try {
      const res = await api.patch(`/community/comments/${commentId}`, { body: text })
      // Merge object một phần vào comment đầy đủ (giữ author/reactions) — tránh crash render.
      const partial = unwrap<Partial<Comment>>(res)
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...partial } : c)))
      setEditingCommentId(null)
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể cập nhật bình luận'))
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      await api.delete(`/community/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      onChange({ ...post, commentCount: Math.max(0, post.commentCount - 1) })
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể xoá bình luận'))
    } finally {
      setConfirmDelComment(null)
    }
  }

  const edited = post.updatedAt && post.updatedAt !== post.createdAt

  return (
    <article
      className={[
        'rounded-2xl border p-4 [background:var(--pf-surface)] transition-shadow',
        highlight
          ? '[border-color:var(--pf-primary)] shadow-md'
          : 'border-[color:var(--pf-border)]',
      ].join(' ')}
    >
      {/* header */}
      <div className="flex items-start gap-3">
        <Avatar name={post.author.fullName} url={post.author.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold [color:var(--pf-text)]">
              {post.author.fullName}
            </span>
            {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
          </div>
          <p className="text-[11px] [color:var(--pf-color-muted)]">
            {timeAgo(post.createdAt)}
            {edited ? ' · đã sửa' : ''}
          </p>
        </div>
        {!editingPost && (
          <div className="flex shrink-0 items-center gap-1">
            {post.canEdit && (
              <button
                type="button"
                aria-label="Sửa bài viết"
                onClick={() => {
                  setEditBody(post.body)
                  setEditingPost(true)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]"
              >
                <Pencil size={15} />
              </button>
            )}
            {post.canDelete && (
              <button
                type="button"
                aria-label="Xoá bài viết"
                onClick={() => setConfirmDel(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]"
              >
                <Trash2 size={15} />
              </button>
            )}
            {/* Báo cáo — chỉ với bài của người khác (không phải chủ/không phải admin). */}
            {!post.canDelete && (
              <button
                type="button"
                aria-label="Báo cáo bài viết"
                title="Báo cáo cho quản trị viên"
                onClick={() => setConfirmReport(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[color:var(--pf-color-warning)] hover:[background:var(--pf-color-warning-soft)]"
              >
                <Flag size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* body */}
      {editingPost ? (
        <div className="mt-3">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-bg)] px-3 py-2 text-sm outline-none [color:var(--pf-text)] focus:[border-color:var(--pf-primary-soft)]"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <ActionButton
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setEditingPost(false)}
            >
              Huỷ
            </ActionButton>
            <ActionButton
              type="button"
              variant="primary"
              className="min-h-11"
              disabled={!editBody.trim() || savingEdit}
              icon={savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              onClick={saveEdit}
            >
              Lưu
            </ActionButton>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed [color:var(--pf-text)]">
          {renderWithMentions(post.body, members)}
        </p>
      )}

      {post.imageUrl && !editingPost && (
        <img
          src={mediaUrl(post.imageUrl)}
          alt=""
          className="mt-3 max-h-96 max-w-full rounded-xl border border-[color:var(--pf-border)] object-cover"
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      {/* actions row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ReactionBar reactions={post.reactions} onReact={reactPost} />
        <button
          type="button"
          onClick={toggleComments}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold [color:var(--pf-color-muted)] transition-colors hover:[background:var(--pf-color-muted-soft)] hover:[color:var(--pf-primary)]"
        >
          <MessageCircle size={15} />
          Bình luận ({post.commentCount})
        </button>
      </div>

      {/* comments */}
      {commentsOpen && (
        <div className="mt-4 border-t border-[color:var(--pf-border)] pt-4">
          {loadingComments ? (
            <LoadingState rows={2} />
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => {
                const cEdited = c.updatedAt && c.updatedAt !== c.createdAt
                const isEditing = editingCommentId === c.id
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.author.fullName} url={c.author.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="rounded-2xl [background:var(--pf-bg)] px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold [color:var(--pf-text)]">
                            {c.author.fullName}
                          </span>
                          {(c.canEdit || c.canDelete) && !isEditing && (
                            <div className="flex shrink-0 items-center gap-0.5">
                              {c.canEdit && (
                                <button
                                  type="button"
                                  aria-label="Sửa bình luận"
                                  onClick={() => {
                                    setEditingCommentId(c.id)
                                    setEditCommentBody(c.body)
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-md [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]"
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                              {c.canDelete && (
                                <button
                                  type="button"
                                  aria-label="Xoá bình luận"
                                  onClick={() => setConfirmDelComment(c.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-md [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-1">
                            <textarea
                              value={editCommentBody}
                              onChange={(e) => setEditCommentBody(e.target.value)}
                              rows={2}
                              className="w-full resize-none rounded-lg border border-[color:var(--pf-border)] [background:var(--pf-surface)] px-2 py-1.5 text-sm outline-none [color:var(--pf-text)]"
                            />
                            <div className="mt-1.5 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="min-h-11 rounded-full px-3 text-xs font-semibold [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]"
                              >
                                Huỷ
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveCommentEdit(c.id)}
                                disabled={!editCommentBody.trim()}
                                className="min-h-11 rounded-full px-3 text-xs font-semibold text-white disabled:opacity-50 [background:var(--pf-primary)]"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed [color:var(--pf-text)]">
                            {renderWithMentions(c.body, members)}
                          </p>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="mt-1 flex items-center gap-2 pl-1">
                          <span className="text-[11px] [color:var(--pf-color-muted)]">
                            {timeAgo(c.createdAt)}
                            {cEdited ? ' · đã sửa' : ''}
                          </span>
                          <ReactionBar
                            reactions={c.reactions}
                            onReact={(emoji) => void reactComment(c.id, emoji)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {commentsLoaded && comments.length === 0 && (
                <p className="text-xs [color:var(--pf-color-muted)]">
                  Chưa có bình luận. Hãy là người đầu tiên!
                </p>
              )}

              {/* add comment (có @mention) */}
              <form onSubmit={submitComment} className="pt-1">
                {cmtMentions.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {cmtMentions.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                        @{m.fullName}
                        <button type="button" aria-label={`Bỏ thẻ ${m.fullName}`} onClick={() => setCmtMentions((p) => p.filter((x) => x.id !== m.id))} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:[background:var(--pf-primary)] hover:[color:var(--pf-primary-on)]">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {showCmtMention && (
                  <MentionPicker
                    members={members}
                    query={cmtMentionQuery}
                    onQueryChange={setCmtMentionQuery}
                    onPick={insertCmtMention}
                    onClose={() => setShowCmtMention(false)}
                  />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCmtMention((v) => !v); setCmtMentionQuery('') }}
                    aria-label="Gắn thẻ thành viên"
                    className={[
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
                      showCmtMention ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]' : '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]',
                    ].join(' ')}
                  >
                    <AtSign size={17} />
                  </button>
                  <input
                    ref={cmtInputRef}
                    value={newComment}
                    onChange={onCmtChange}
                    aria-label="Viết bình luận"
                    placeholder="Viết bình luận…  (gõ @ để gắn thẻ)"
                    className="min-h-11 min-w-0 flex-1 rounded-full border border-[color:var(--pf-border)] [background:var(--pf-bg)] px-4 text-sm outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)] focus:[border-color:var(--pf-primary-soft)]"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || addingComment}
                    aria-label="Gửi bình luận"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-[0.96] disabled:opacity-50 [background:var(--pf-primary)]"
                  >
                    {addingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        title="Xoá bài viết?"
        message="Bài viết và toàn bộ bình luận sẽ bị xoá vĩnh viễn."
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(false)}
      />
      <ConfirmDialog
        open={confirmReport}
        variant="warning"
        title="Báo cáo nội dung này?"
        message="Quản trị viên sẽ nhận báo cáo và xem xét nội dung này."
        confirmLabel="Báo cáo"
        onConfirm={reportPost}
        onCancel={() => setConfirmReport(false)}
      />
      <ConfirmDialog
        open={confirmDelComment !== null}
        title="Xoá bình luận?"
        message="Hành động này không thể khôi phục."
        onConfirm={() => confirmDelComment && void deleteComment(confirmDelComment)}
        onCancel={() => setConfirmDelComment(null)}
      />
    </article>
  )
}

/* ────────────────────────────── Matchmaking ────────────────────────────── */

const MATCH_STATUS: Record<MatchStatus, { tone: 'success' | 'warning' | 'neutral' | 'danger'; label: string }> = {
  OPEN: { tone: 'success', label: 'Đang mở' },
  FULL: { tone: 'warning', label: 'Đã đủ người' },
  CLOSED: { tone: 'neutral', label: 'Đã đóng' },
  CANCELLED: { tone: 'danger', label: 'Đã huỷ' },
}

function MatchCard({ match, onChange }: { match: Match; onChange: (m: Match) => void }) {
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const status = MATCH_STATUS[match.status]
  const timeRange = formatTimeRange(match.startTime, match.endTime)
  const closedOrCancelled = match.status === 'CLOSED' || match.status === 'CANCELLED'

  const join = async () => {
    setBusy(true)
    try {
      const res = await api.post(`/community/matchmaking/${match.id}/join`)
      onChange(unwrap<Match>(res))
      toast.success('Đã tham gia kèo')
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể tham gia'))
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    try {
      const res = await api.delete(`/community/matchmaking/${match.id}/join`)
      onChange(unwrap<Match>(res))
      toast.success('Đã rời kèo')
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể rời kèo'))
    } finally {
      setBusy(false)
    }
  }

  const close = async () => {
    setBusy(true)
    try {
      const res = await api.patch(`/community/matchmaking/${match.id}/close`)
      const partial = unwrap<{ id: string; status: MatchStatus }>(res)
      onChange({ ...match, status: partial.status })
      toast.success('Đã đóng kèo')
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể đóng kèo'))
    } finally {
      setBusy(false)
      setConfirmClose(false)
    }
  }

  const renderAction = (): ReactNode => {
    if (match.isCreator) {
      return (
        <ActionButton
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={busy || closedOrCancelled}
          onClick={() => setConfirmClose(true)}
        >
          {match.status === 'CLOSED' ? 'Đã đóng' : 'Đóng kèo'}
        </ActionButton>
      )
    }
    if (match.isJoined) {
      return (
        <ActionButton
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={busy || closedOrCancelled}
          onClick={leave}
        >
          Rời kèo
        </ActionButton>
      )
    }
    if (match.status === 'FULL') {
      return <StatusBadge tone="warning">Đã đủ người</StatusBadge>
    }
    return (
      <ActionButton
        type="button"
        variant="primary"
        className="min-h-11"
        disabled={busy || closedOrCancelled}
        icon={busy ? <Loader2 size={16} className="animate-spin" /> : undefined}
        onClick={join}
      >
        Tham gia
      </ActionButton>
    )
  }

  return (
    <article className="rounded-2xl border border-[color:var(--pf-border)] [background:var(--pf-surface)] p-4">
      <div className="flex items-start gap-3">
        <Avatar name={match.creator.fullName} url={match.creator.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm [color:var(--pf-text)]">
            <span className="font-semibold">{match.creator.fullName}</span>
            <span className="[color:var(--pf-color-muted)]"> đang tìm người chơi</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs [color:var(--pf-color-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} />
              {formatPlayDate(match.playDate)}
            </span>
            {timeRange && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} />
                {timeRange}
              </span>
            )}
          </div>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone="info">{match.sport}</StatusBadge>
        {match.format && <StatusBadge tone="neutral">{match.format}</StatusBadge>}
        {match.skillLevel != null && (
          <StatusBadge tone="neutral">Trình độ {match.skillLevel}/10</StatusBadge>
        )}
      </div>

      {match.note && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed [color:var(--pf-text)]">
          {match.note}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Users size={15} className="[color:var(--pf-color-muted)]" />
        <span className="text-sm font-medium [color:var(--pf-text)]">
          {match.status === 'OPEN' && match.remaining > 0
            ? `Cần thêm ${match.remaining} người`
            : `Đã có ${match.joinedCount}/${match.neededCount} người`}
        </span>
      </div>

      {match.participants.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex -space-x-2">
            {match.participants.slice(0, 6).map((p) => (
              <span
                key={p.id}
                className="rounded-full ring-2 [--tw-ring-color:var(--pf-surface)]"
                title={p.fullName}
              >
                <Avatar name={p.fullName} url={p.avatarUrl} size={28} />
              </span>
            ))}
          </div>
          {match.participants.length > 6 && (
            <span className="text-xs [color:var(--pf-color-muted)]">
              +{match.participants.length - 6}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">{renderAction()}</div>

      <ConfirmDialog
        open={confirmClose}
        variant="warning"
        title="Đóng kèo này?"
        message="Sau khi đóng, các thành viên sẽ không tham gia được nữa."
        confirmLabel="Đóng kèo"
        onConfirm={close}
        onCancel={() => setConfirmClose(false)}
      />
    </article>
  )
}

interface MatchFormState {
  sport: string
  playDate: string
  startTime: string
  endTime: string
  format: string
  neededCount: string
  skillLevel: string
  note: string
}

function CreateMatchModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (m: Match) => void
}) {
  const [form, setForm] = useState<MatchFormState>({
    sport: 'Pickleball',
    playDate: '',
    startTime: '',
    endTime: '',
    format: '',
    neededCount: '2',
    skillLevel: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof MatchFormState>(k: K, v: MatchFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const submit = async () => {
    const needed = parseInt(form.neededCount, 10)
    if (!form.sport.trim()) {
      toast.error('Vui lòng nhập môn thể thao')
      return
    }
    if (!form.playDate) {
      toast.error('Vui lòng chọn ngày chơi')
      return
    }
    if (!needed || needed < 1) {
      toast.error('Số người cần thêm phải ≥ 1')
      return
    }
    const skill = form.skillLevel ? parseInt(form.skillLevel, 10) : undefined
    setSubmitting(true)
    try {
      const res = await api.post('/community/matchmaking', {
        sport: form.sport.trim(),
        playDate: form.playDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        format: form.format.trim() || undefined,
        neededCount: needed,
        skillLevel: skill,
        note: form.note.trim() || undefined,
      })
      onCreated(unwrap<Match>(res))
      toast.success('Đã tạo kèo')
      onClose()
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể tạo kèo'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full min-h-11 rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-bg)] px-3 text-sm outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)] focus:[border-color:var(--pf-primary-soft)]'
  const labelCls = 'mb-1 block text-xs font-semibold [color:var(--pf-color-muted)]'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo kèo mới"
      subtitle="Tìm người chơi cùng trong CLB"
      size="md"
      footer={
        <>
          <ActionButton type="button" variant="ghost" className="min-h-11" onClick={onClose}>
            Huỷ
          </ActionButton>
          <ActionButton
            type="button"
            variant="primary"
            className="min-h-11"
            disabled={submitting}
            icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            onClick={submit}
          >
            Tạo kèo
          </ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className={labelCls}>Môn thể thao *</label>
          <input
            className={inputCls}
            value={form.sport}
            onChange={(e) => set('sport', e.target.value)}
            placeholder="Pickleball, Tennis…"
          />
        </div>
        <div>
          <label className={labelCls}>Ngày chơi *</label>
          <input
            type="date"
            className={inputCls}
            value={form.playDate}
            onChange={(e) => set('playDate', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Giờ bắt đầu</label>
            <input
              type="time"
              className={inputCls}
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Giờ kết thúc</label>
            <input
              type="time"
              className={inputCls}
              value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Cần thêm (người) *</label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className={inputCls}
              value={form.neededCount}
              onChange={(e) => set('neededCount', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Trình độ (1-10)</label>
            <input
              type="number"
              min={1}
              max={10}
              inputMode="numeric"
              className={inputCls}
              value={form.skillLevel}
              onChange={(e) => set('skillLevel', e.target.value)}
              placeholder="Tuỳ chọn"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Hình thức</label>
          <input
            className={inputCls}
            value={form.format}
            onChange={(e) => set('format', e.target.value)}
            placeholder="Đôi nam, đôi nữ, giao lưu…"
          />
        </div>
        <div>
          <label className={labelCls}>Ghi chú</label>
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-bg)] px-3 py-2 text-sm outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)] focus:[border-color:var(--pf-primary-soft)]"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Địa điểm, mức phí sân, yêu cầu khác…"
          />
        </div>
      </div>
    </Modal>
  )
}

/* ────────────────────────────── Page ────────────────────────────── */

export default function MemberCommunity() {
  const user = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab: TabKey = searchParams.get('tab') === 'matchmaking' ? 'matchmaking' : 'feed'
  const [tab, setTab] = useState<TabKey>(initialTab)
  const highlightPostId = searchParams.get('post')

  /* feed state */
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [members, setMembers] = useState<MentionMember[]>([])

  /* matchmaking state */
  const [matches, setMatches] = useState<Match[]>([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState(false)
  const [matchLoaded, setMatchLoaded] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const changeTab = (key: string) => {
    const next = key as TabKey
    setTab(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'matchmaking') params.set('tab', 'matchmaking')
    else params.delete('tab')
    setSearchParams(params, { replace: true })
  }

  /* fetch feed */
  const fetchFeed = useCallback(async () => {
    setFeedLoading(true)
    setFeedError(false)
    try {
      const res = await api.get('/community/feed', { params: { limit: 15 } })
      const data = unwrap<FeedResponse>(res)
      setPosts(data.items ?? [])
      setNextCursor(data.nextCursor ?? null)
    } catch {
      setFeedError(true)
    } finally {
      setFeedLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await api.get('/community/feed', { params: { limit: 15, cursor: nextCursor } })
      const data = unwrap<FeedResponse>(res)
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...(data.items ?? []).filter((p) => !seen.has(p.id))]
      })
      setNextCursor(data.nextCursor ?? null)
    } catch (err) {
      toast.error(apiMessage(err, 'Không tải thêm được'))
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore])

  useEffect(() => {
    void fetchFeed()
  }, [fetchFeed])

  /* members (once) */
  useEffect(() => {
    let alive = true
    api
      .get('/community/members')
      .then((res) => {
        if (alive) setMembers(unwrap<MentionMember[]>(res) ?? [])
      })
      .catch(() => {
        /* mention picker chỉ là tuỳ chọn — im lặng nếu lỗi */
      })
    return () => {
      alive = false
    }
  }, [])

  /* matchmaking lazy fetch when tab active */
  const fetchMatches = useCallback(async () => {
    setMatchLoading(true)
    setMatchError(false)
    try {
      const res = await api.get('/community/matchmaking')
      setMatches(unwrap<Match[]>(res) ?? [])
      setMatchLoaded(true)
    } catch {
      setMatchError(true)
    } finally {
      setMatchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'matchmaking' && !matchLoaded) void fetchMatches()
  }, [tab, matchLoaded, fetchMatches])

  /* infinite scroll for feed */
  useEffect(() => {
    if (tab !== 'feed' || !nextCursor) return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [tab, nextCursor, loadMore])

  /* feed mutations */
  const handlePostCreated = (p: Post) => setPosts((prev) => [p, ...prev])
  const handlePostChange = (p: Post) =>
    setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)))
  const handlePostDelete = (id: string) => setPosts((prev) => prev.filter((x) => x.id !== id))

  /* match mutations */
  const handleMatchCreated = (m: Match) => setMatches((prev) => [m, ...prev])
  const handleMatchChange = (m: Match) =>
    setMatches((prev) => prev.map((x) => (x.id === m.id ? m : x)))

  const tabs = [
    { key: 'feed', label: 'Bảng tin' },
    { key: 'matchmaking', label: 'Tìm kèo' },
  ]

  return (
    <PageShell maxWidth={900}>
      <PageHeader
        title="Cộng đồng CLB"
        subtitle="Kết nối, chia sẻ và tìm bạn chơi cùng"
        actions={
          tab === 'matchmaking' ? (
            <ActionButton
              type="button"
              variant="primary"
              className="min-h-11"
              icon={<Plus size={16} />}
              onClick={() => setCreateOpen(true)}
            >
              Tạo kèo
            </ActionButton>
          ) : undefined
        }
      />

      <ResponsiveTabs tabs={tabs} active={tab} onChange={changeTab} className="mb-5" />

      {tab === 'feed' ? (
        <div className="flex flex-col gap-4">
          <Composer
            members={members}
            authorName={user?.username ?? 'Bạn'}
            authorUrl={null}
            onCreated={handlePostCreated}
          />

          {feedLoading ? (
            <LoadingState rows={3} />
          ) : feedError ? (
            <ErrorState onRetry={() => void fetchFeed()} />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={24} />}
              title="Chưa có bài viết nào"
              description="Hãy là người đầu tiên chia sẻ với cộng đồng CLB!"
            />
          ) : (
            <>
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  members={members}
                  highlight={p.id === highlightPostId}
                  onChange={handlePostChange}
                  onDelete={handlePostDelete}
                />
              ))}

              {nextCursor && (
                <div ref={sentinelRef} className="flex justify-center py-2">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--pf-border)] px-5 text-sm font-semibold [color:var(--pf-primary)] transition-colors hover:[background:var(--pf-primary-soft)] disabled:opacity-50"
                  >
                    {loadingMore && <Loader2 size={16} className="animate-spin" />}
                    Xem thêm
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {matchLoading ? (
            <LoadingState rows={3} />
          ) : matchError ? (
            <ErrorState onRetry={() => void fetchMatches()} />
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<Users size={24} />}
              title="Chưa có kèo nào"
              description="Tạo kèo để tìm người chơi cùng trong CLB."
              action={
                <ActionButton
                  type="button"
                  variant="primary"
                  className="min-h-11"
                  icon={<Plus size={16} />}
                  onClick={() => setCreateOpen(true)}
                >
                  Tạo kèo
                </ActionButton>
              }
            />
          ) : (
            matches.map((m) => (
              <MatchCard key={m.id} match={m} onChange={handleMatchChange} />
            ))
          )}
        </div>
      )}

      <CreateMatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleMatchCreated}
      />
    </PageShell>
  )
}
