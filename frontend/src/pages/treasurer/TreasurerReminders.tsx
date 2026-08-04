import { useState, useEffect } from 'react'
import { Bell, Send, CheckCircle, Clock, FileSpreadsheet, FileText } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useClubContributions } from '../../hooks/useFinanceData'
import { useAuthStore } from '../../store/authStore'
import { formatVND, getActiveChungPeriod } from '../../lib/utils'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

export function TreasurerReminders() {
  const isMobile = useIsMobile()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)
  // Option 3: self-fetch cục bộ (không đọc global store) — tái dùng nguyên vẹn phép tính client.
  const { data: contributions } = useClubContributions(clubId)

  const activePeriod = getActiveChungPeriod(data.fundPeriods)

  // CANONICAL: tập thành viên CHƯA đóng đủ (money-based) từ fund-periods summary — gồm cả
  // short-payer (đã nộp base nhưng còn thiếu phí sinh hoạt). Fallback record-based khi chưa có summary.
  const [unpaidSet, setUnpaidSet] = useState<Set<string> | null>(null)
  useEffect(() => {
    if (!activePeriod?.id || isLocalToken(accessToken)) { setUnpaidSet(null); return }
    let cancelled = false
    api.get(`/fund-periods/${activePeriod.id}/summary`).then((res) => {
      if (cancelled) return
      const list = (res.data?.data?.members ?? []) as { memberId: string; contributionPaid?: boolean }[]
      setUnpaidSet(new Set(list.filter((m) => !m.contributionPaid).map((m) => m.memberId)))
    }).catch(() => { if (!cancelled) setUnpaidSet(null) })
    return () => { cancelled = true }
  }, [activePeriod?.id, accessToken])
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [sendingAll, setSendingAll] = useState(false)

  const commonContribs = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')

  // Thành viên CHƯA đóng đủ (canonical money-based, gồm short-payer). Fallback record-based
  // (chưa có khoản đã xác nhận) khi summary chưa tải.
  const unpaidMembers = data.members
    .filter(m => m.status === 'active')
    .filter(m => {
      if (unpaidSet) return unpaidSet.has(m.id)
      const contrib = commonContribs.find(
        c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id) && c.isConfirmed
      )
      return !contrib
    })

  // Members with unconfirmed COMMON contributions (paid but not confirmed yet)
  const pendingMembers = data.members
    .filter(m => m.status === 'active')
    .filter(m => {
      const contrib = commonContribs.find(
        c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id)
      )
      return contrib && !contrib.isConfirmed
    })

  const dispatchReminder = async (member: typeof unpaidMembers[0]) => {
    if (!member.userId) return false
    const periodName = activePeriod?.name ?? 'kỳ quỹ hiện tại'
    const amount = activePeriod?.contributionAmount ?? 0
    await api.post('/hermes/dispatch', {
      eventType: 'payment_reminder',
      clubId,
      targetUserId: member.userId,
      title: 'Nhắc nhở đóng quỹ',
      body: `Bạn chưa đóng quỹ ${periodName}${amount ? ` (${formatVND(amount)})` : ''}. Vui lòng thanh toán sớm.`,
      priority: 'MEDIUM',
    })
    return true
  }

  const sendReminder = async (member: typeof unpaidMembers[0]) => {
    if (!member.userId) {
      toast.error(`${member.fullName} chưa có tài khoản app — không thể gửi thông báo`)
      return
    }
    setLoadingIds(prev => new Set([...prev, member.id]))
    try {
      await dispatchReminder(member)
      setSentIds(prev => new Set([...prev, member.id]))
      toast.success(`Đã gửi nhắc nhở tới ${member.fullName}`)
    } catch {
      toast.error(`Gửi thất bại cho ${member.fullName}`)
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(member.id); return s })
    }
  }

  const sendAll = async () => {
    const withAccount = unpaidMembers.filter(m => m.userId)
    const noAccount = unpaidMembers.filter(m => !m.userId)
    if (withAccount.length === 0) {
      toast.error('Không có thành viên nào có tài khoản app để gửi thông báo')
      return
    }
    setSendingAll(true)
    try {
      const results = await Promise.allSettled(withAccount.map(m => dispatchReminder(m)))
      const ok = results.filter(r => r.status === 'fulfilled').length
      setSentIds(prev => new Set([...prev, ...withAccount.map(m => m.id)]))
      if (ok > 0) toast.success(`Đã gửi nhắc nhở tới ${ok} thành viên`)
      if (noAccount.length > 0) toast(`${noAccount.length} thành viên chưa có tài khoản app bị bỏ qua`, { icon: 'ℹ️' })
    } catch {
      toast.error('Có lỗi khi gửi nhắc nhở')
    } finally {
      setSendingAll(false)
    }
  }

  const amount = activePeriod?.contributionAmount ?? 1000000

  const doExportExcel = () => {
    exportGenericExcel('Nhac_dong_quy', 'Chưa đóng',
      ['Thành viên', 'Liên hệ', 'Số tiền cần đóng (VNĐ)', 'Trạng thái'],
      unpaidMembers.map((m) => [m.fullName, m.phone ?? m.email ?? '', amount, sentIds.has(m.id) ? 'Đã nhắc' : 'Chưa đóng']),
    )
    toast.success('Đã xuất Excel danh sách chưa đóng')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: 'Nhac_dong_quy',
      title: 'Danh Sách Chưa Đóng Quỹ',
      subtitle: activePeriod?.name,
      metaLeft: `${unpaidMembers.length} chưa đóng · ${pendingMembers.length} chờ xác nhận`,
      columns: [
        { header: '#', align: 'center' }, { header: 'Thành viên' }, { header: 'Liên hệ' },
        { header: 'Số tiền cần đóng', align: 'right' }, { header: 'Trạng thái', align: 'center' },
      ],
      rows: unpaidMembers.map((m, i) => [i + 1, m.fullName, m.phone ?? m.email ?? '—', formatVND(amount), sentIds.has(m.id) ? 'Đã nhắc' : 'Chưa đóng']),
      summaryLabel: 'Tổng cần thu',
      summaryValue: formatVND(unpaidMembers.length * amount),
    })
    toast.success('Đã xuất PDF danh sách chưa đóng')
  }

  if (isMobile) {
    const doneCnt = data.members.filter(m => m.status === 'active').length - unpaidMembers.length
    return (
      <div className="min-h-screen [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] [color:var(--pf-text)]">Nhắc Nhở Đóng Quỹ</div>
            {activePeriod && <div className="text-[12px] [color:var(--pf-color-muted)]">{activePeriod.name} · {formatVND(amount)}/người</div>}
          </div>
          {unpaidMembers.length > 0 && (
            <button
              onClick={sendAll}
              disabled={sendingAll}
              className="flex items-center gap-1 text-[12px] font-[600] [color:var(--pf-primary)] active:opacity-70 disabled:opacity-50"
            >
              <Send size={13} />{sendingAll ? 'Đang gửi…' : 'Nhắc tất cả'}
            </button>
          )}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Chưa đóng', value: `${unpaidMembers.length}`, color: 'text-red-500', Icon: Bell },
              { label: 'Chờ xác nhận', value: `${pendingMembers.length}`, color: 'text-amber-600', Icon: Clock },
              { label: 'Hoàn thành', value: `${doneCnt}`, color: 'text-emerald-600', Icon: CheckCircle },
            ].map(k => (
              <div key={k.label} className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] p-3 text-center shadow-sm">
                <div className={`text-[16px] font-[800] ${k.color}`}>{k.value}</div>
                <div className="text-[10px] [color:var(--pf-color-muted)] mt-0.5 leading-tight">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Unpaid */}
          {unpaidMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Bell size={13} className="text-red-500" />
                <span className="text-[13px] font-[700] [color:var(--pf-text)]">Chưa đóng quỹ</span>
                <span className="ml-auto text-[12px] font-[600] text-red-500">{unpaidMembers.length} người</span>
              </div>
              {unpaidMembers.map(m => {
                const sent = sentIds.has(m.id)
                return (
                  <div key={m.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[14px] font-[700] [color:var(--pf-text)]">{m.fullName}</div>
                        <div className="text-[12px] [color:var(--pf-color-muted)] mt-0.5">{m.phone ?? m.email ?? '—'}</div>
                      </div>
                      <div className="text-[14px] font-[700] text-red-500 shrink-0">{formatVND(amount)}</div>
                    </div>
                    {!sent ? (
                      <div className="flex gap-2 mt-3">
                        {m.userId ? (
                          <button
                            onClick={() => sendReminder(m)}
                            disabled={loadingIds.has(m.id)}
                            className="flex-1 h-8 flex items-center justify-center gap-1 rounded-[10px] text-[12px] font-[600] bg-blue-50 text-blue-600 active:bg-blue-100 disabled:opacity-50"
                          >
                            <Send size={12} />{loadingIds.has(m.id) ? 'Đang gửi…' : 'Nhắc nhở'}
                          </button>
                        ) : (
                          <div className="flex-1 h-8 flex items-center justify-center rounded-[10px] text-[11px] [color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] border border-dashed border-[color:var(--pf-border)]">
                            Chưa có tài khoản app
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-1 text-[12px] text-emerald-600 font-[600]">
                        <CheckCircle size={13} />Đã gửi nhắc nhở
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pending */}
          {pendingMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Clock size={13} className="text-amber-500" />
                <span className="text-[13px] font-[700] [color:var(--pf-text)]">Chờ xác nhận</span>
                <span className="ml-auto text-[12px] font-[600] text-amber-600">{pendingMembers.length} người</span>
              </div>
              {pendingMembers.map(m => {
                const contrib = commonContribs.find(c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id))
                return (
                  <div key={m.id} className="[background:var(--pf-surface)] rounded-[16px] border border-amber-100 p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-[700] [color:var(--pf-text)]">{m.fullName}</div>
                      {contrib?.notes && <div className="text-[12px] [color:var(--pf-color-muted)] mt-0.5">{contrib.notes}</div>}
                    </div>
                    <div className="text-[14px] font-[700] text-amber-600 shrink-0">{formatVND(contrib?.amount ?? amount)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {unpaidMembers.length === 0 && pendingMembers.length === 0 && (
            <div className="[background:var(--pf-surface)] rounded-[16px] border border-dashed border-[color:var(--pf-border)] py-16 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-300 mb-3" />
              <p className="text-[14px] font-[600] [color:var(--pf-color-muted)]">Tất cả thành viên đã đóng quỹ!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader
        title="Nhắc Nhở Đóng Quỹ"
        subtitle={activePeriod ? `${activePeriod.name} · ${formatVND(amount)}/người` : 'Chưa có kỳ quỹ mở'}
        actions={
          unpaidMembers.length > 0
            ? <div className="flex items-center gap-2">
                <button onClick={doExportExcel} aria-label="Xuất Excel"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] text-sm font-semibold hover:bg-slate-200 transition-colors">
                  <FileSpreadsheet size={14} />Xuất Excel
                </button>
                <button onClick={doExportPdf} aria-label="Xuất PDF"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] text-sm font-semibold hover:bg-slate-200 transition-colors">
                  <FileText size={14} />Xuất PDF
                </button>
                <button
                  onClick={sendAll}
                  disabled={sendingAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg [background:var(--pf-primary)] text-white text-sm font-semibold hover:[background:var(--pf-primary-hover)] disabled:opacity-50 transition-colors">
                  <Send size={14} />{sendingAll ? 'Đang gửi…' : `Nhắc tất cả (${unpaidMembers.length})`}
                </button>
              </div>
            : undefined
        }
      />

      <div className="p-6 max-w-[900px] mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                <Bell size={14} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Chưa đóng</p>
            </div>
            <p className="text-2xl font-bold text-red-500">{unpaidMembers.length} người</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{formatVND(unpaidMembers.length * amount)}</p>
          </div>
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Chờ xác nhận</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingMembers.length} người</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">Đã nộp tiền, chưa duyệt</p>
          </div>
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Đã hoàn thành</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {data.members.filter(m => m.status === 'active').length - unpaidMembers.length} người
            </p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">Đã xác nhận đóng quỹ</p>
          </div>
        </div>

        {/* Unpaid members */}
        {unpaidMembers.length > 0 && (
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-x-auto">
            <div className="px-4 py-3 border-b border-[color:var(--pf-border)] flex items-center gap-2">
              <Bell size={14} className="text-red-500" />
              <h3 className="text-sm font-semibold [color:var(--pf-text)]">Thành viên chưa đóng quỹ</h3>
              <Badge variant="red" className="ml-auto">{unpaidMembers.length}</Badge>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Liên hệ</th>
                  <th className="text-right">Số tiền cần đóng</th>
                  <th className="text-center w-28">Trạng thái</th>
                  <th className="text-center w-32">Nhắc nhở</th>
                </tr>
              </thead>
              <tbody>
                {unpaidMembers.map(m => {
                  const sent = sentIds.has(m.id)
                  return (
                    <tr key={m.id}>
                      <td className="font-medium [color:var(--pf-text)]">{m.fullName}</td>
                      <td className="[color:var(--pf-color-muted)] text-xs">{m.phone ?? m.email ?? '—'}</td>
                      <td className="text-right font-semibold text-red-500">{formatVND(amount)}</td>
                      <td className="text-center">
                        {sent
                          ? <Badge variant="green" dot>Đã nhắc</Badge>
                          : <Badge variant="red" dot>Chưa đóng</Badge>}
                      </td>
                      <td className="text-center">
                        {m.userId ? (
                          <button
                            onClick={() => sendReminder(m)}
                            disabled={sent || loadingIds.has(m.id)}
                            className="h-7 px-3 flex items-center gap-1 mx-auto rounded-md text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send size={11} />{loadingIds.has(m.id) ? 'Đang gửi…' : 'Nhắc nhở'}
                          </button>
                        ) : (
                          <span className="text-xs [color:var(--pf-color-muted)] italic">Chưa có tài khoản</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending confirmation */}
        {pendingMembers.length > 0 && (
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-x-auto">
            <div className="px-4 py-3 border-b border-[color:var(--pf-border)] flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold [color:var(--pf-text)]">Chờ xác nhận thanh toán</h3>
              <Badge variant="yellow" className="ml-auto">{pendingMembers.length}</Badge>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th className="text-right">Số tiền</th>
                  <th className="text-center">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {pendingMembers.map(m => {
                  const contrib = commonContribs.find(c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id))
                  return (
                    <tr key={m.id}>
                      <td className="font-medium [color:var(--pf-text)]">{m.fullName}</td>
                      <td className="text-right font-semibold text-amber-600">{formatVND(contrib?.amount ?? amount)}</td>
                      <td className="text-center [color:var(--pf-color-muted)] text-xs">{contrib?.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {unpaidMembers.length === 0 && pendingMembers.length === 0 && (
          <div className="[background:var(--pf-surface)] rounded-xl border border-dashed border-[color:var(--pf-border)] py-16 text-center">
            <CheckCircle size={36} className="mx-auto text-emerald-300 mb-3" />
            <p className="text-sm font-semibold [color:var(--pf-color-muted)]">Tất cả thành viên đã đóng quỹ!</p>
            <p className="text-xs [color:var(--pf-color-muted)] mt-1">Không cần gửi nhắc nhở trong kỳ này.</p>
          </div>
        )}
      </div>
    </div>
  )
}
