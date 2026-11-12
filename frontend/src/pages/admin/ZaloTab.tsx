import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Link as RouterLink } from 'react-router-dom'
import { PhoneToolbar } from '../../components/mobile/PhoneToolbar'
import { RefreshCw, Send, FileText, Link, Save } from '../../components/icons/mobileLucide'

interface ZaloStatus {
  configured: boolean; intakeEnabled?: boolean; commandsEnabled?: boolean; paymentReminders?: boolean; resultImages?: boolean; failStreak?: number; lastErrorAt?: string | null; botName?: string; canJoinGroups?: boolean; webhookReady?: boolean;
  enabled?: boolean; financialChanges?: boolean; announcements?: boolean; dailyReport?: boolean;
  reportTime?: string; weeklyReport?: boolean; reportWeekday?: number;
  chatId?: string | null; chatName?: string | null; pendingChat?: { id: string; name: string } | null;
  lastSentAt?: string | null; lastError?: string | null;
  externalWebhook?: boolean;
}
export function ZaloTab() {
  const [status, setStatus] = useState<ZaloStatus | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [pair, setPair] = useState<{ command: string; expiresAt: string } | null>(null)
  const [preview, setPreview] = useState('')
  const [previewImage, setPreviewImage] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [disconnect, setDisconnect] = useState(false)
  const [sendReport, setSendReport] = useState(false)
  const [externalOnRegister, setExternalOnRegister] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [groupName, setGroupName] = useState('')
  // Phân biệt rõ: máy chủ báo lỗi / máy chủ đang cập nhật / không gọi được máy chủ (mạng, proxy). Trước đây mọi trường hợp
  // không có nội dung lỗi đều hiện chung "Không kết nối được Zalo", không biết lỗi nằm ở đâu.
  const describe = (e: any): string => {
    const r = e?.response
    const m = r?.data?.message
    if (m) return Array.isArray(m) ? m.join('; ') : String(m)
    if (r) return `Máy chủ trả lỗi ${r.status}${r.status >= 500 ? ' (có thể đang cập nhật — thử lại sau ít giây)' : ''}.`
    return 'Không gọi được máy chủ PickleFund (mạng hoặc lớp proxy bị ngắt/chuyển hướng). Thử lại; nếu lặp lại, báo kèm giờ và thao tác vừa làm.'
  }
  const error = (e: any) => toast.error(describe(e))
  // Thao tác idempotent: tự thử lại 1 lần khi mất kết nối hoặc 502/503/504 (vd. đúng lúc máy chủ đang khởi động lại).
  const retryable = (e: any) => !e?.response || [502, 503, 504].includes(e.response.status)
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms))
  const postR = async (url: string, body?: unknown) => { try { return await api.post(url, body) } catch (e) { if (!retryable(e)) throw e; await wait(1500); return api.post(url, body) } }
  const getR = async (url: string) => { try { return await api.get(url) } catch (e) { if (!retryable(e)) throw e; await wait(1500); return api.get(url) } }
  const reload = async () => { try { setStatus((await getR('/zalo/status')).data.data); setLoadFailed(false) } catch (e) { setLoadFailed(true); error(e) } }
  useEffect(() => { void reload() }, [])
  const action = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn() } catch (e) { error(e) } finally { setBusy(false) } }
  const register = () => action(async () => {
    setStatus((await api.post('/zalo/bot', { token: token.trim(), ...(externalOnRegister ? { external: true } : {}) })).data.data)
    setToken(''); setPair(null); toast.success('Đã kiểm tra bot. Xem trạng thái quyền nhóm và webhook bên dưới.')
  })
  const save = () => action(async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(status?.reportTime ?? '08:00')) { toast.error('Chọn giờ báo cáo hợp lệ'); return }
    setStatus((await postR('/zalo/preferences', { enabled: !!status?.enabled, intakeEnabled: !!status?.intakeEnabled, commandsEnabled: !!status?.commandsEnabled, paymentReminders: !!status?.paymentReminders, resultImages: !!status?.resultImages, announcements: !!status?.announcements, weeklyReport: !!status?.weeklyReport, reportWeekday: status?.reportWeekday ?? 0, reportTime: status?.reportTime ?? '08:00' })).data.data)
    toast.success('Đã lưu lựa chọn gửi Zalo')
  })
  const test = () => action(async () => { await api.post('/zalo/test'); toast.success('Đã gửi tin kiểm tra vào nhóm đã xác nhận') })
  const showPreview = async () => { setPreviewFailed(false); setPreviewImage(''); try { const data = (await api.get('/zalo/report-preview')).data.data; setPreview(data.text); setPreviewImage(data.imageUrl) } catch (e) { setPreviewFailed(true); error(e) } }
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
      <p className="text-sm [color:var(--pf-color-muted)]">Nhận thông báo CLB, báo cáo tài chính hằng tuần có logo trong nhóm Zalo đã xác nhận. Chủ động chọn giờ gửi theo giờ Việt Nam.</p>
      {!status ? <p role={loadFailed ? 'alert' : 'status'}>{loadFailed ? 'Không tải được kết nối. Bấm Làm mới để thử lại.' : 'Đang tải kết nối…'}</p> : <>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg px-2 py-1 [background:var(--pf-surface-muted)]">{status.configured ? status.botName : 'Chưa đăng ký bot'}</span>
          {status.configured && <span className={status.canJoinGroups ? 'text-green-700' : 'text-amber-800'}>{status.canJoinGroups ? 'Có quyền tham gia nhóm' : 'Chưa được Zalo cấp quyền nhóm'}</span>}
        </div>
        {status.configured && !status.canJoinGroups && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Nhóm Zalo Bot đang ở chế độ Beta. Bot này chưa được Zalo cấp quyền tham gia nhóm; app chưa thể gửi vào nhóm. Liên hệ Zalo để được cấp quyền hoặc dùng bot đã được cấp quyền.</p>}
        <label className="block text-sm font-semibold" htmlFor="zalo-token">{status.configured ? 'Thay token bot' : 'Token từ Zalo Bot Creator'}</label>
        <input id="zalo-token" type="password" autoComplete="new-password" value={token} onChange={e => setToken(e.target.value)} maxLength={512} className="input-base" placeholder="Dán token bot vào đây" />
        <p className="text-xs [color:var(--pf-color-muted)]">Token được mã hóa trên máy chủ, không hiển thị lại sau khi lưu. Không gửi token vào nhóm chat.</p>
        <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" checked={externalOnRegister} onChange={e => setExternalOnRegister(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>Bot này đã được nền tảng khác (vd. AI-BOT) nhận tin — <b>không đăng ký webhook</b>, PickleFund chỉ gửi thông báo vào nhóm. Nếu không chọn mà bot đang thuộc nền tảng khác, PickleFund sẽ báo và không chiếm webhook.</span></label>
        <Button onClick={register} disabled={busy || !token.trim()}><Link size={16} />{busy ? 'Đang xử lý…' : 'Kiểm tra và đăng ký bot'}</Button>
        <a className="block text-sm underline" href="https://zalo.me/s/botcreator/" target="_blank" rel="noopener noreferrer">Mở Zalo Bot Creator</a>
      </>}
    </section>
    {status?.configured && <section className="pf-glass rounded-2xl p-4 space-y-3">
      <h3 className="font-bold">Kết nối đúng nhóm CLB</h3>
      <p className="text-sm">Thêm bot vào nhóm CLB. Tạo mã, gõ @ và chọn bot từ danh sách Zalo rồi thêm dòng lệnh phía sau trong nhóm đó; mã có hạn 10 phút. Quay lại app bấm Làm mới và xác nhận nhóm nhận được.</p>
      <Button disabled={busy || !status.canJoinGroups || !status.webhookReady || !!status.externalWebhook} onClick={() => action(async () => { setPair((await api.post('/zalo/pair')).data.data) })}>Tạo mã kết nối nhóm</Button>
      {status.externalWebhook && <p className="text-xs [color:var(--pf-color-muted)]">Webhook do nền tảng khác giữ nên PickleFund không nhận được mã /ketnoi. Dùng nhóm đã liên kết sẵn bên dưới.</p>}
      {pair && <div className="rounded-xl border p-3 space-y-2"><code className="block break-all select-all text-sm">{pair.command}</code><p className="text-xs">Hết hạn: {new Date(pair.expiresAt).toLocaleTimeString('vi-VN')}</p></div>}
      {status.pendingChat && <div className="rounded-xl border p-3 space-y-2"><p className="break-words font-semibold">Nhóm chờ xác nhận: {status.pendingChat.name}</p><p className="text-xs break-all">ID: {status.pendingChat.id}</p><Button disabled={busy} onClick={() => action(async () => { setStatus((await postR('/zalo/confirm-group')).data.data); setPair(null); toast.success('Đã xác nhận nhóm. Chọn nội dung và bật tự động khi sẵn sàng.') })}>Xác nhận đây là nhóm CLB</Button></div>}
      {status.chatId && <p className="break-all text-sm">Nhóm đã liên kết: <strong>{status.chatName}</strong> · {status.chatId}</p>}
      {status.externalWebhook && <div className="rounded-xl border p-3 space-y-2">
        <p className="text-sm font-semibold">{status.chatId ? 'Đổi nhóm nhận thông báo (nhập mã nhóm Zalo)' : 'Chưa có nhóm nhận thông báo — nhập mã nhóm Zalo để dùng “Gửi thử” và “Báo cáo”'}</p>
        <label className="block text-sm" htmlFor="zalo-group-id">Mã nhóm Zalo (dạng zgr-…)
          <input id="zalo-group-id" type="text" value={groupId} onChange={e => setGroupId(e.target.value)} maxLength={150} className="input-base mt-2 w-full" placeholder="zgr-…" autoComplete="off" />
        </label>
        <label className="block text-sm" htmlFor="zalo-group-name">Tên hiển thị (tùy chọn)
          <input id="zalo-group-name" type="text" value={groupName} onChange={e => setGroupName(e.target.value)} maxLength={150} className="input-base mt-2 w-full" placeholder="CLB The PING" />
        </label>
        <Button disabled={busy || !groupId.trim()} onClick={() => action(async () => { setStatus((await postR('/zalo/group', { chatId: groupId.trim(), ...(groupName.trim() ? { chatName: groupName.trim() } : {}) })).data.data); setGroupId(''); setGroupName(''); toast.success('Đã lưu nhóm. Bật “Bật gửi tự động” rồi bấm Lưu khi sẵn sàng.') })}>Lưu nhóm</Button>
        <p className="text-xs [color:var(--pf-color-muted)]">Đổi sang nhóm khác sẽ tự tắt gửi tự động để tránh gửi nhầm. Nhóm giữ nguyên thì cấu hình gửi không đổi.</p>
      </div>}
      <p className="text-sm">Webhook: {status.externalWebhook ? 'Do nền tảng khác (vd. AI-BOT) quản lý — PickleFund chỉ gửi tin ra, không đụng webhook' : status.webhookReady ? 'Đã xác minh' : 'Chưa xác minh — bấm “Kiểm tra lại webhook”; nếu vẫn lỗi, kiểm tra HTTPS và đăng ký lại bot'}</p>
      <div className="flex flex-wrap gap-2">
        {!status.externalWebhook && <Button variant="outline" disabled={busy} onClick={() => action(async () => { const s = (await postR('/zalo/webhook-verify')).data.data; setStatus(s); if (s.webhookReady) toast.success('Webhook đã xác minh'); else toast.error('Webhook vẫn chưa xác minh được') })}>{status.webhookReady ? 'Đặt lại webhook về PickleFund' : 'Kiểm tra lại webhook'}</Button>}
        <Button variant="outline" disabled={busy} onClick={() => action(async () => { const on = !status.externalWebhook; setStatus((await postR('/zalo/external-webhook', { enabled: on })).data.data); toast.success(on ? 'Đã chuyển sang chế độ webhook do nền tảng khác quản lý' : 'Đã tắt chế độ này. Bấm “Kiểm tra lại webhook” để nhận lại webhook') })}>{status.externalWebhook ? 'Tắt chế độ webhook do nền tảng khác' : 'Webhook do nền tảng khác (AI-BOT) quản lý'}</Button>
      </div>
    </section>}
    {status?.configured && <section className="pf-glass rounded-2xl p-4 space-y-3">
      <h3 className="font-bold">Nội dung gửi vào nhóm</h3>
      {([['enabled','Bật gửi tự động'],['announcements','Lịch hoạt động và thành viên mới'],['intakeEnabled','Nhập thu/chi qua bot (cần liên kết tài khoản)'],['commandsEnabled','Tra cứu & lệnh trong nhóm: /quy /congno /lich /bxh /dangky /huy /diemdanh'],['paymentReminders','Nhắc đóng quỹ riêng từng thành viên đã liên kết (9:00, khi gần/quá hạn)'],['resultImages','Tự gửi ảnh bảng xếp hạng khi giải kết thúc'],['weeklyReport','Báo cáo tài chính hằng tuần']] as const).map(([key,label]) => <label key={key} className="flex min-h-11 items-center justify-between gap-3 border-b py-2 text-sm"><span>{label}</span><input type="checkbox" checked={!!status[key]} disabled={busy || !status.chatId || (!!status.externalWebhook && (key==='intakeEnabled' || key==='commandsEnabled') && !status[key])} onChange={e=>setStatus({...status,[key]:e.target.checked})} className="h-5 w-5 shrink-0" /></label>)}
      <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
        <label className="block min-w-0 text-sm font-semibold" htmlFor="zalo-report-time">Giờ gửi báo cáo
          <input id="zalo-report-time" type="time" step={60} value={status.reportTime ?? '08:00'} disabled={busy || !status.chatId || !status.weeklyReport} onChange={e=>setStatus({...status,reportTime:e.target.value})} onInput={e=>{const value=e.currentTarget.value;setStatus(previous=>previous?{...previous,reportTime:value}:previous)}} className="input-base mt-2 w-full min-w-0" />
        </label>
        <label className="block min-w-0 text-sm font-semibold" htmlFor="zalo-report-weekday">Ngày gửi hằng tuần
          <select id="zalo-report-weekday" className="input-base mt-2 w-full" value={status.reportWeekday ?? 0} disabled={busy || !status.chatId || !status.weeklyReport} onChange={e=>setStatus({...status,reportWeekday:Number(e.target.value)})}>
            {['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'].map((label,n)=><option key={n} value={n}>{label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs [color:var(--pf-color-muted)]">Giờ Việt Nam (UTC+7) · Bấm Lưu để áp dụng. Báo cáo tài chính chỉ gửi một lần mỗi tuần vào ngày, giờ đã chọn. Lịch hoạt động và thành viên mới gửi theo sự kiện.</p>
      <p className="text-xs [color:var(--pf-color-muted)]">Chỉ gửi số liệu tổng hợp của CLB. Tin nhắn nhắc nợ cá nhân, trao đổi riêng và báo cáo kiểm duyệt không chuyển vào nhóm. Không gửi riêng từng biến động quỹ để tránh làm phiền nhóm.</p>
      {status.lastSentAt && <p className="text-sm">Gửi thành công gần nhất: {new Date(status.lastSentAt).toLocaleString('vi-VN')}</p>}
      {(status.failStreak ?? 0) >= 3 && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"><b>Cảnh báo:</b> bot đã gửi lỗi {status.failStreak} lần liên tiếp{status.lastErrorAt ? ` (gần nhất ${new Date(status.lastErrorAt).toLocaleString('vi-VN')})` : ''}. Kiểm tra token, quyền bot trong nhóm hoặc đăng ký lại bot.</p>}
      {status.lastError && <p role="alert" className="text-sm text-red-700">{status.lastError}</p>}
      <Button variant="outline" disabled={busy} onClick={()=>setDisconnect(true)}>Ngắt kết nối Zalo</Button>
    </section>}
    {status?.intakeEnabled && <p className="text-sm">Phiếu thu/chi từ Zalo xử lý tại <RouterLink className="inline-flex font-semibold underline max-lg:min-h-11 max-lg:items-center" to="/tai-chinh?tab=payments">Tài chính → Xác nhận thu/chi</RouterLink>.</p>}
    <ConfirmDialog open={disconnect} title="Ngắt kết nối Zalo?" message="Dừng gửi tự động và gỡ token bot khỏi CLB. Muốn dùng lại cần đăng ký và xác nhận nhóm lại." confirmLabel="Ngắt kết nối" onCancel={()=>setDisconnect(false)} onConfirm={()=>action(async()=>{await api.post('/zalo/disconnect');setDisconnect(false);setPair(null);setStatus({configured:false})})} />
    <Modal open={sendReport} title="Báo cáo tài chính gửi vào nhóm" subtitle={status?.chatName ?? undefined} onClose={()=>{setSendReport(false);setPreview('')}} footer={<Button disabled={busy || !preview} onClick={()=>action(async()=>{await api.post('/zalo/report');setSendReport(false);setPreview('');toast.success('Đã gửi báo cáo tài chính')})}>Gửi vào nhóm đã xác nhận</Button>}>
      {previewImage ? <img src={previewImage} referrerPolicy="no-referrer" alt="Báo cáo thu chi và số dư quỹ của CLB, có logo và bảng đối chiếu" className="h-auto w-full rounded-xl" onError={()=>{setPreviewImage('');setPreviewFailed(true)}} /> : <p className="text-sm" role={previewFailed?'alert':'status'}>{previewFailed?'Không tạo được bản xem trước. Đóng và mở lại để thử.':'Đang tạo ảnh báo cáo…'}</p>}
      {preview && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Đọc nội dung dạng chữ</summary><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{preview}</p></details>}
    </Modal>
  </div>
}
