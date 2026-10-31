import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { PhoneToolbar } from '../../components/mobile/PhoneToolbar'
import { RefreshCw, Send, FileText, Link, Save } from '../../components/icons/mobileLucide'

interface ZaloStatus {
  configured: boolean; botName?: string; canJoinGroups?: boolean; webhookReady?: boolean;
  enabled?: boolean; financialChanges?: boolean; announcements?: boolean; dailyReport?: boolean;
  chatId?: string | null; chatName?: string | null; pendingChat?: { id: string; name: string } | null;
  lastSentAt?: string | null; lastError?: string | null;
}
export function ZaloTab() {
  const [status, setStatus] = useState<ZaloStatus | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [pair, setPair] = useState<{ command: string; expiresAt: string } | null>(null)
  const [preview, setPreview] = useState('')
  const [disconnect, setDisconnect] = useState(false)
  const [sendReport, setSendReport] = useState(false)
  const error = (e: any) => toast.error(e?.response?.data?.message ?? 'Không kết nối được Zalo. Thử lại sau.')
  const reload = async () => { try { setStatus((await api.get('/zalo/status')).data.data); setLoadFailed(false) } catch (e) { setLoadFailed(true); error(e) } }
  useEffect(() => { void reload() }, [])
  const action = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn() } catch (e) { error(e) } finally { setBusy(false) } }
  const register = () => action(async () => {
    setStatus((await api.post('/zalo/bot', { token: token.trim() })).data.data)
    setToken(''); setPair(null); toast.success('Đã kiểm tra bot. Xem trạng thái quyền nhóm và webhook bên dưới.')
  })
  const save = () => action(async () => {
    setStatus((await api.post('/zalo/preferences', { enabled: !!status?.enabled, financialChanges: !!status?.financialChanges, announcements: !!status?.announcements, dailyReport: !!status?.dailyReport })).data.data)
    toast.success('Đã lưu lựa chọn gửi Zalo')
  })
  const test = () => action(async () => { await api.post('/zalo/test'); toast.success('Đã gửi tin kiểm tra vào nhóm đã xác nhận') })
  const showPreview = async () => { try { setPreview((await api.get('/zalo/report-preview')).data.data.text) } catch (e) { error(e) } }
  const tools = [
    { key: 'refresh', label: 'Làm mới', icon: <RefreshCw />, disabled: busy, onClick: reload },
    { key: 'test', label: 'Gửi thử', icon: <Send />, disabled: busy || !status?.chatId, onClick: test },
    { key: 'report', label: 'Báo cáo', icon: <FileText />, disabled: busy || !status?.chatId, onClick: () => { setPreview(''); void showPreview(); setSendReport(true) } },
    { key: 'save', label: 'Lưu', icon: <Save />, primary: true, disabled: busy || !status?.configured, onClick: save },
  ]
  return <div className="space-y-4">
    <PhoneToolbar label="Công cụ Zalo" tools={tools} fallback={<div className="flex flex-wrap gap-2">{tools.map(t => <Button key={t.key} disabled={t.disabled} onClick={t.onClick}>{t.icon}{t.label}</Button>)}</div>} />
    <section className="pf-glass rounded-2xl p-4 space-y-3">
      <h3 className="text-base font-bold">Zalo Bot của CLB</h3>
      <p className="text-sm [color:var(--pf-color-muted)]">Nhận thông báo CLB, báo cáo tài chính lúc 08:00 và biến động quỹ trong nhóm Zalo đã xác nhận. Mỗi CLB dùng một bot riêng.</p>
      {!status ? <p role={loadFailed ? 'alert' : 'status'}>{loadFailed ? 'Không tải được kết nối. Bấm Làm mới để thử lại.' : 'Đang tải kết nối…'}</p> : <>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg px-2 py-1 [background:var(--pf-surface-muted)]">{status.configured ? status.botName : 'Chưa đăng ký bot'}</span>
          {status.configured && <span className={status.canJoinGroups ? 'text-green-700' : 'text-amber-800'}>{status.canJoinGroups ? 'Có quyền tham gia nhóm' : 'Chưa được Zalo cấp quyền nhóm'}</span>}
        </div>
        {status.configured && !status.canJoinGroups && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Nhóm Zalo Bot đang ở chế độ Beta. Bot này chưa được Zalo cấp quyền tham gia nhóm; app chưa thể gửi vào nhóm. Liên hệ Zalo để được cấp quyền hoặc dùng bot đã được cấp quyền.</p>}
        <label className="block text-sm font-semibold" htmlFor="zalo-token">{status.configured ? 'Thay token bot' : 'Token từ Zalo Bot Creator'}</label>
        <input id="zalo-token" type="password" autoComplete="new-password" value={token} onChange={e => setToken(e.target.value)} maxLength={512} className="input-base" placeholder="Dán token bot vào đây" />
        <p className="text-xs [color:var(--pf-color-muted)]">Token được mã hóa trên máy chủ, không hiển thị lại sau khi lưu. Không gửi token vào nhóm chat.</p>
        <Button onClick={register} disabled={busy || !token.trim()}><Link size={16} />{busy ? 'Đang xử lý…' : 'Kiểm tra và đăng ký bot'}</Button>
        <a className="block text-sm underline" href="https://zalo.me/s/botcreator/" target="_blank" rel="noopener noreferrer">Mở Zalo Bot Creator</a>
      </>}
    </section>
    {status?.configured && <section className="pf-glass rounded-2xl p-4 space-y-3">
      <h3 className="font-bold">Kết nối đúng nhóm CLB</h3>
      <p className="text-sm">Thêm bot vào nhóm CLB. Tạo mã, gõ @ và chọn bot từ danh sách Zalo rồi thêm dòng lệnh phía sau trong nhóm đó; mã có hạn 10 phút. Quay lại app bấm Làm mới và xác nhận nhóm nhận được.</p>
      <Button disabled={busy || !status.canJoinGroups || !status.webhookReady} onClick={() => action(async () => { setPair((await api.post('/zalo/pair')).data.data) })}>Tạo mã kết nối nhóm</Button>
      {pair && <div className="rounded-xl border p-3 space-y-2"><code className="block break-all select-all text-sm">{pair.command}</code><p className="text-xs">Hết hạn: {new Date(pair.expiresAt).toLocaleTimeString('vi-VN')}</p></div>}
      {status.pendingChat && <div className="rounded-xl border p-3 space-y-2"><p className="break-words font-semibold">Nhóm chờ xác nhận: {status.pendingChat.name}</p><p className="text-xs break-all">ID: {status.pendingChat.id}</p><Button disabled={busy} onClick={() => action(async () => { setStatus((await api.post('/zalo/confirm-group')).data.data); setPair(null); toast.success('Đã xác nhận nhóm. Chọn nội dung và bật tự động khi sẵn sàng.') })}>Xác nhận đây là nhóm CLB</Button></div>}
      {status.chatId && <p className="break-all text-sm">Nhóm đã liên kết: <strong>{status.chatName}</strong> · {status.chatId}</p>}
      <p className="text-sm">Webhook: {status.webhookReady ? 'Đã xác minh' : 'Chưa xác minh — kiểm tra HTTPS và đăng ký lại bot'}</p>
    </section>}
    {status?.configured && <section className="pf-glass rounded-2xl p-4 space-y-3">
      <h3 className="font-bold">Nội dung gửi vào nhóm</h3>
      {([['enabled','Bật gửi tự động'],['announcements','Lịch hoạt động và thành viên mới'],['financialChanges','Biến động thu, chi, số dư quỹ (kiểm tra mỗi phút)'],['dailyReport','Báo cáo tài chính hằng ngày lúc 08:00 (giờ Việt Nam)']] as const).map(([key,label]) => <label key={key} className="flex min-h-11 items-center justify-between gap-3 border-b py-2 text-sm"><span>{label}</span><input type="checkbox" checked={!!status[key]} disabled={busy || !status.chatId} onChange={e=>setStatus({...status,[key]:e.target.checked})} className="h-5 w-5 shrink-0" /></label>)}
      <p className="text-xs [color:var(--pf-color-muted)]">Chỉ gửi số liệu tổng hợp của CLB. Tin nhắn nhắc nợ cá nhân, trao đổi riêng và báo cáo kiểm duyệt không chuyển vào nhóm. Khi bật lần đầu, hệ thống ghi nhận mốc quỹ hiện tại; những thay đổi sau đó mới được gửi.</p>
      {status.lastSentAt && <p className="text-sm">Gửi thành công gần nhất: {new Date(status.lastSentAt).toLocaleString('vi-VN')}</p>}
      {status.lastError && <p role="alert" className="text-sm text-red-700">{status.lastError}</p>}
      <Button variant="outline" disabled={busy} onClick={()=>setDisconnect(true)}>Ngắt kết nối Zalo</Button>
    </section>}
    <ConfirmDialog open={disconnect} title="Ngắt kết nối Zalo?" message="Dừng gửi tự động và gỡ token bot khỏi CLB. Muốn dùng lại cần đăng ký và xác nhận nhóm lại." confirmLabel="Ngắt kết nối" onCancel={()=>setDisconnect(false)} onConfirm={()=>action(async()=>{await api.post('/zalo/disconnect');setDisconnect(false);setPair(null);setStatus({configured:false})})} />
    <Modal open={sendReport} title="Báo cáo tài chính gửi vào nhóm" subtitle={status?.chatName ?? undefined} onClose={()=>{setSendReport(false);setPreview('')}} footer={<Button disabled={busy || !preview} onClick={()=>action(async()=>{await api.post('/zalo/report');setSendReport(false);setPreview('');toast.success('Đã gửi báo cáo tài chính')})}>Gửi vào nhóm đã xác nhận</Button>}>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{preview || 'Đang tải nội dung báo cáo…'}</p>
    </Modal>
  </div>
}
